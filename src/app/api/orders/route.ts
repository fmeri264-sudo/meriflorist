import { NextRequest, NextResponse } from 'next/server'
import { generateOrderNumber } from '@/lib/utils'
import { initPayment } from '@/lib/tbank'
import { notifyOrder } from '@/lib/meribuket'
import { sendText } from '@/lib/max-bot'

const SB_URL = process.env.SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }

async function sb(path: string, init?: RequestInit) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...h, ...(init?.headers ?? {}) },
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
      deliveryCost,
      cardText,
      photoReport,
      comment,
      paymentMethod,
      items,
      subtotal,
      total,
      bonusUsed,
    } = body

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
        paymentStatus: 'PENDING',
        status: 'PENDING',
        subtotal,
        total,
        totalAmount: total,
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

    // Уведомляем только для CASH/SBP — для ONLINE ждём подтверждения оплаты
    if (paymentMethod !== 'ONLINE') {
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
        const payLine = paymentMethod === 'SBP' ? '📱 СБП' : '💵 Наличные'
        const bonusLine = bonusUsed > 0 ? `\n🎁 Списано бонусов: ${bonusUsed} ₽` : ''
        const msg = [
          `🆕 Новый заказ ${order.number}`,
          `👤 ${recipientName ?? ''} · ${recipientPhone ?? ''}`,
          deliveryLine,
          itemLines,
          `${payLine} · Итого: ${total.toLocaleString('ru')} ₽${bonusLine}`,
          comment ? `💬 ${comment}` : '',
          cardText ? `📝 Открытка: ${cardText}` : '',
        ]
          .filter(Boolean)
          .join('\n')
        sendText(adminId, msg).catch(() => {})
      }
    }

    // Списание бонусов
    async function deductBonuses() {
      if (!bonusUsed || bonusUsed <= 0 || !recipientPhone) return
      const phone = recipientPhone.replace(/\D/g, '')
      const variants = [phone, `+${phone}`]
      const filter = variants.map((v: string) => `phone.eq.${encodeURIComponent(v)}`).join(',')
      try {
        const custRes = await fetch(
          `${SB_URL}/rest/v1/Customer?or=(${filter})&select=id,bonuses&order=bonuses.desc&limit=1`,
          { headers: h }
        )
        if (custRes.ok) {
          const custs: { id: number; bonuses: number }[] = await custRes.json()
          if (custs.length) {
            const newBonuses = Math.max(0, (custs[0].bonuses ?? 0) - bonusUsed)
            await fetch(`${SB_URL}/rest/v1/Customer?id=eq.${custs[0].id}`, {
              method: 'PATCH',
              headers: { ...h, Prefer: 'return=minimal' },
              body: JSON.stringify({ bonuses: newBonuses }),
            })
          }
        }
      } catch {
        /* не критично */
      }
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

      const [result] = await Promise.all([
        initPayment({
          orderId: order.id,
          amount: total,
          description: `Заказ ${number} — Meri Florist`,
          orderNumber: number,
          customerEmail: customerEmail, // ✅ ДОБАВЛЕНО
          customerPhone: recipientPhone, // ✅ ДОБАВЛЕНО
          items: receiptItemsForPayment,
          taxation: 'osn', // ✅ ДОБАВЛЕНО (укажите вашу систему налогообложения)
        }),
        deductBonuses(),
      ])
      paymentUrl = result?.paymentUrl ?? null

      if (!paymentUrl) {
        // Не показываем покупателю страницу «Заказ оформлен», если банк
        // отклонил Init или настройки терминала недействительны.
        return NextResponse.json(
          { error: 'Т-Банк не создал ссылку на оплату. Проверьте настройки терминала и журнал сервера.' },
          { status: 502 }
        )
      }

      console.log('🔵 Результат initPayment:', result)
      console.log('🔵 paymentUrl:', paymentUrl)
    } else {
      await deductBonuses()
    }

    return NextResponse.json({ number: order.number, orderId: order.id, paymentUrl })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[orders POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
