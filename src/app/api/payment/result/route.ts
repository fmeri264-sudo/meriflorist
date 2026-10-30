import { NextRequest, NextResponse } from 'next/server'
import { verifyNotification } from '@/lib/tbank'
import { notifyOrder } from '@/lib/meribuket'
import { sendText } from '@/lib/max-bot'
import { createDeliveryClaim } from '@/lib/yandex-delivery'

const SB_URL = process.env.SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }

// T-Bank отправляет POST с JSON или form-data — поддерживаем оба формата
export async function POST(req: NextRequest) {
  let params: Record<string, string> = {}

  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const json = await req.json()
    params = Object.fromEntries(Object.entries(json).map(([k, v]) => [k, String(v)]))
  } else {
    const form = await req.formData()
    form.forEach((v, k) => { params[k] = String(v) })
  }

  if (!verifyNotification(params)) {
    return new NextResponse('bad sign', { status: 400 })
  }

  // T-Bank: статусы CONFIRMED и AUTHORIZED означают успешную оплату
  const status = params.Status ?? ''
  const orderId = params.OrderId ?? ''
  if (!orderId || !['CONFIRMED', 'AUTHORIZED'].includes(status)) {
    return new NextResponse('OK', { status: 200 })
  }

  // Обновляем статус только если ещё не PAID — защита от дублей при повторных webhook
  const patchRes = await fetch(`${SB_URL}/rest/v1/Order?id=eq.${orderId}&paymentStatus=neq.PAID`, {
    method: 'PATCH',
    headers: { ...h, Prefer: 'return=representation', Accept: 'application/json' },
    body: JSON.stringify({ paymentStatus: 'PAID', tbankPaymentId: params.PaymentId ?? null }),
  })
  const patched = patchRes.ok ? await patchRes.json() : []
  if (!patched.length) {
    // Уже обработано — игнорируем повторный webhook
    return new NextResponse('OK', { status: 200 })
  }

  // Получаем заказ с позициями для уведомлений
  try {
    const orderRes = await fetch(
      `${SB_URL}/rest/v1/Order?id=eq.${orderId}&select=*,items:OrderItem(*,product:Product(name,images,sku))&limit=1`,
      { headers: h }
    )
    if (orderRes.ok) {
      const orders = await orderRes.json()
      const order = orders[0]
      if (order) {
        type Item = { productName?: string; product?: { name: string; images: string[]; sku?: string }; quantity?: number; qty?: number; price: number }
        const firstItem: Item | undefined = order.items?.[0]

        if (firstItem) {
          notifyOrder({
            order_number: order.number,
            sku: firstItem.product?.sku ?? '',
            item_name: firstItem.product?.name ?? firstItem.productName ?? '',
            quantity: firstItem.quantity ?? firstItem.qty ?? 1,
            total_price: order.totalAmount,
            recipient_name: order.recipientName ?? '',
            recipient_phone: order.recipientPhone ?? '',
            address: order.selfPickup ? 'Самовывоз' : (order.address ?? ''),
            delivery_date: `${order.deliveryDate ?? ''}${order.deliveryTime ? ` ${order.deliveryTime}` : ''}`,
            comment: order.cardText ? `Текст открытки: ${order.cardText}` : '',
            photo_url: firstItem.product?.images?.[0] ?? '',
          }).catch(() => {})
        }

        // Яндекс Доставка — только после подтверждения оплаты, только для курьерских заказов
        if (!order.selfPickup && order.address) {
          createDeliveryClaim({
            address: order.address,
            recipientName: order.recipientName ?? '',
            recipientPhone: order.recipientPhone ?? '',
            amount: order.totalAmount,
            orderNumber: order.number,
            courierNote: order.comment ?? undefined,
            deliveryDate: order.deliveryDate ? order.deliveryDate.split('T')[0] : undefined,
            deliveryTime: order.deliveryTime ?? undefined,
          }).then(result => {
            if (result.claimId) {
              fetch(`${SB_URL}/rest/v1/Order?id=eq.${orderId}`, {
                method: 'PATCH',
                headers: { ...h, Prefer: 'return=minimal' },
                body: JSON.stringify({ ydClaimId: result.claimId }),
              }).catch(() => {})
            } else {
              console.error('[payment] YD claim error:', result.error)
            }
          }).catch(e => console.error('[payment] YD claim exception:', e))
        }

        const adminId = process.env.MAX_ADMIN_USER_ID ? Number(process.env.MAX_ADMIN_USER_ID) : null
        if (adminId) {
          const deliveryLine = order.selfPickup
            ? '🏪 Самовывоз'
            : `📍 ${order.address ?? ''}${order.deliveryDate ? `, ${new Date(order.deliveryDate).toLocaleDateString('ru-RU')}` : ''}${order.deliveryTime ? ` ${order.deliveryTime}` : ''}`
          const itemLines = (order.items as Item[])
            .map(it => `• ${it.product?.name ?? it.productName ?? ''} × ${it.quantity ?? it.qty ?? 1} — ${((it.price) * (it.quantity ?? it.qty ?? 1)).toLocaleString('ru')} ₽`)
            .join('\n')
          const msg = [
            `🆕 Новый заказ ${order.number}`,
            `👤 ${order.recipientName ?? ''} · ${order.recipientPhone ?? ''}`,
            deliveryLine,
            itemLines,
            `💳 Онлайн (оплачено) · Итого: ${order.totalAmount.toLocaleString('ru')} ₽`,
            order.promoCode ? `🏷 Промокод ${order.promoCode}: −${order.promoDiscount ?? 0} ₽` : '',
            order.comment ? `💬 ${order.comment}` : '',
            order.cardText ? `📝 Открытка: ${order.cardText}` : '',
          ].filter(Boolean).join('\n')
          sendText(adminId, msg).catch(() => {})
        }
      }
    }
  } catch { /* не критично */ }

  return new NextResponse('OK', { status: 200 })
}
