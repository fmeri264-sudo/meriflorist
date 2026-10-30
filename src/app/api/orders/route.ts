import { NextRequest, NextResponse } from 'next/server'
import { generateOrderNumber } from '@/lib/utils'
import { initPayment } from '@/lib/tbank'
import { notifyOrder } from '@/lib/meribuket'
import { sendText } from '@/lib/max-bot'
import { priceCheckoutItems, checkoutCustomer } from '@/lib/checkout-pricing'
import { CheckoutError, calculateTotals, promoDiscount } from '@/lib/promocodes'
import { findPromoCode } from '@/lib/promo-store'

const SB_URL = process.env.SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }

async function sb(path: string, init?: RequestInit) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...h, ...(init?.headers ?? {}) },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
  return res
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      recipientName,
      recipientPhone,
      address,
      deliveryDate,
      deliveryTime,
      selfPickup,
      deliveryCost: suppliedDeliveryCost,
      cardText,
      photoReport,
      comment,
      paymentMethod,
      items: suppliedItems,
      bonusUsed: suppliedBonuses,
      promoCode,
    } = body

    if (!['ONLINE', 'CASH', 'SBP'].includes(paymentMethod) || typeof recipientName !== 'string' ||
        !recipientName.trim() || typeof recipientPhone !== 'string' || !/^\+?7\d{10}$/.test(recipientPhone)) {
      throw new CheckoutError('Проверьте имя, телефон и способ оплаты')
    }
    const items = await priceCheckoutItems(suppliedItems, sb)
    const calculatedSubtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)
    const promo = promoCode ? await findPromoCode(promoCode) : null
    const discount = promo ? promoDiscount(promo, calculatedSubtotal) : 0
    const requestedBonuses = suppliedBonuses ?? 0
    if (!Number.isSafeInteger(requestedBonuses) || requestedBonuses < 0) throw new CheckoutError('Некорректное количество бонусов')
    if (promo && requestedBonuses > 0) throw new CheckoutError('Выберите промокод или бонусы — вместе они не применяются')
    if (body.subtotal !== calculatedSubtotal) throw new CheckoutError('Стоимость товаров изменилась. Обновите корзину перед оплатой.', 409)
    const customer = requestedBonuses > 0 ? await checkoutCustomer(recipientPhone, sb) : null
    if (requestedBonuses > (customer?.bonuses ?? 0)) throw new CheckoutError('Баланс бонусов изменился. Обновите заказ.', 409)
    const { subtotal, total, bonusUsed, deliveryCost } = calculateTotals(
      calculatedSubtotal, selfPickup ? 0 : (suppliedDeliveryCost ?? 0), discount,
      requestedBonuses, customer?.bonuses ?? 0,
    )
    const number = generateOrderNumber()

    // Создаём заказ
    const orderRes = await sb('Order', {
      method: 'POST',
      body: JSON.stringify({
        number,
        recipientName,
        recipientPhone,
        address: address ?? null,
        deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : null,
        deliveryTime: deliveryTime ?? null,
        selfPickup: selfPickup ?? false,
        deliveryCost: deliveryCost ?? 0,
        cardText: cardText ?? null,
        photoReport: photoReport ?? false,
        comment: comment ?? null,
        paymentMethod,
        paymentStatus: total === 0 ? 'PAID' : 'PENDING',
        status: 'PENDING',
        subtotal,
        total,
        totalAmount: total,
        ...(promo ? { promoCode: promo.code, promoDiscount: discount } : {}),
      }),
      headers: { ...h, Prefer: 'return=representation' },
    })

    const [order] = await orderRes.json()

    // Создаём позиции заказа
    let firstItem: {
      productId: number
      sku?: string
      name?: string
      image?: string
      size: string
      price: number
      qty: number
    } | null = null

    if (items?.length) {
      const orderItems = items.map((item: {
        productId: number
        sku?: string
        name?: string
        image?: string
        size: string
        price: number
        qty: number
      }) => {
        if (!firstItem) firstItem = item
        return {
          orderId: order.id,
          productId: item.productId,
          productName: item.name ?? '',
          size: item.size,
          price: item.price,
          qty: item.qty,
          quantity: item.qty,
        }
      })

      await sb('OrderItem', {
        method: 'POST',
        body: JSON.stringify(orderItems),
        headers: { ...h, Prefer: 'return=minimal' },
      })
    }

    // Списание бонусов
    async function deductBonuses() {
      if (!bonusUsed || !customer) return
      const res = await sb(`Customer?id=eq.${customer.id}&bonuses=eq.${customer.bonuses}`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ bonuses: customer.bonuses - bonusUsed }),
      })
      if (!(await res.json()).length) throw new CheckoutError('Баланс бонусов изменился. Обновите заказ.', 409)
    }

    // ✅ ИСПРАВЛЕНО: Инициализация платежа с чеком
    let paymentUrl: string | null = null
    if (paymentMethod === 'ONLINE' && total > 0) {
      // Формируем список товаров для чека
      // T-Bank требует, чтобы сумма позиций чека в точности совпадала с Amount.
      // В total уже входят доставка и списание бонусов, поэтому исходные позиции
      // могут не совпасть с итогом. Передаём одну агрегированную позицию с итоговой суммой.
      const receiptItemsForPayment = [{
        name: `Заказ ${number}`,
        price: total,
        quantity: 1,
        tax: 'none',
      }]

      // Получаем email из данных (если нет, используем телефон)
      const customerEmail = body.email || `${recipientPhone.replace(/\D/g, '')}@example.com`

      const result = await initPayment({
          orderId: order.id,
          amount: total,
          description: `Заказ ${number} — Meri Florist`,
          orderNumber: number,
          customerEmail: customerEmail, // ✅ ДОБАВЛЕНО
          customerPhone: recipientPhone, // ✅ ДОБАВЛЕНО
          items: receiptItemsForPayment,
          taxation: 'osn', // ✅ ДОБАВЛЕНО (укажите вашу систему налогообложения)
        })
      paymentUrl = result?.paymentUrl ?? null

      if (!paymentUrl) {
        // Не показываем покупателю страницу «Заказ оформлен», если банк
        // отклонил Init или настройки терминала недействительны.
        return NextResponse.json(
          { error: 'Т-Банк не создал ссылку на оплату. Проверьте настройки терминала и журнал сервера.' },
          { status: 502 }
        )
      }

      await deductBonuses()
    } else {
      await deductBonuses()
    }

    // Уведомляем только для CASH/SBP — для ONLINE ждём подтверждения оплаты
    if (paymentMethod !== 'ONLINE' || total === 0) {
      if (firstItem) {
        const fi = firstItem as {
          productId: number
          sku?: string
          name?: string
          image?: string
          size: string
          price: number
          qty: number
        }
        notifyOrder({
          order_number: order.number,
          sku: fi.sku ?? '',
          item_name: fi.name
            ? `${fi.name}${fi.size && fi.size !== 'M' ? ` (${fi.size})` : ''}`
            : '',
          quantity: fi.qty,
          total_price: total,
          recipient_name: recipientName ?? '',
          recipient_phone: recipientPhone ?? '',
          address: selfPickup ? 'Самовывоз' : (address ?? ''),
          delivery_date: `${deliveryDate ?? ''}${deliveryTime ? ` ${deliveryTime}` : ''}`,
          comment: cardText ? `Текст открытки: ${cardText}` : '',
          photo_url: fi.image ?? '',
        }).catch(() => {})
      }

      const adminId = process.env.MAX_ADMIN_USER_ID ? Number(process.env.MAX_ADMIN_USER_ID) : null
      if (adminId) {
        const deliveryLine = selfPickup
          ? '🏪 Самовывоз'
          : `📍 ${address ?? ''}${deliveryDate ? `, ${new Date(deliveryDate).toLocaleDateString('ru-RU')}` : ''}${
              deliveryTime ? ` ${deliveryTime}` : ''
            }`
        const itemLines = (items as { name?: string; size?: string; qty: number; price: number }[])
          .map(
            (it) =>
              `• ${it.name ?? ''}${it.size && it.size !== 'M' ? ` (${it.size})` : ''} × ${it.qty} — ${(it.price * it.qty).toLocaleString('ru')} ₽`
          )
          .join('\n')
        const payLine = total === 0 ? 'Без доплаты' : paymentMethod === 'SBP' ? '📱 СБП' : '💵 Наличные'
        const promoLine = promo ? `\n🏷 Промокод ${promo.code}: −${discount} ₽` : ''
        const bonusLine = bonusUsed > 0 ? `\n🎁 Списано бонусов: ${bonusUsed} ₽` : ''
        const msg = [
          `🆕 Новый заказ ${order.number}`,
          `👤 ${recipientName ?? ''} · ${recipientPhone ?? ''}`,
          deliveryLine,
          itemLines,
          `${payLine} · Итого: ${total.toLocaleString('ru')} ₽${bonusLine}${promoLine}`,
          comment ? `💬 ${comment}` : '',
          cardText ? `📝 Открытка: ${cardText}` : '',
        ]
          .filter(Boolean)
          .join('\n')
        sendText(adminId, msg).catch(() => {})
      }
    }

    return NextResponse.json({ number: order.number, orderId: order.id, paymentUrl, total, subtotal, promoDiscount: discount, bonusUsed })
  } catch (e: unknown) {
    if (e instanceof CheckoutError) return NextResponse.json({ error: e.message }, { status: e.status })
    if (e instanceof SyntaxError) return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[orders POST]', msg)
    return NextResponse.json({ error: 'Не удалось оформить заказ. Попробуйте ещё раз.' }, { status: 500 })
  }
}
