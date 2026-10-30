import { NextRequest, NextResponse } from 'next/server'
import { upsertMaxUser, sendText, sendContactRequest, answerCallback } from '@/lib/max-bot'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const SB_H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

async function sbGet(path: string) {
  const res = await fetch(`${SB}/rest/v1/${path}`, { headers: SB_H, cache: 'no-store' })
  return res.ok ? res.json() : []
}

async function sbPatch(path: string, body: object) {
  await fetch(`${SB}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { ...SB_H, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
}

async function sbPost(path: string, body: object) {
  await fetch(`${SB}/rest/v1/${path}`, {
    method: 'POST',
    headers: { ...SB_H, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
}

async function findMatchingBonusRule(totalAmount: number, customerId: number | null): Promise<{ bonusPercent: number; name: string } | null> {
  const rules: { bonusPercent: number; conditionType: string; conditionValue: number | null; name: string }[] =
    await sbGet('BonusRule?isActive=eq.true&order=sortOrder.asc,id.asc')

  let completedOrders = 0
  if (customerId) {
    const orders: { id: number }[] = await sbGet(
      `Order?recipientPhone=not.is.null&select=id&limit=1000`
    )
    completedOrders = orders.length
  }

  for (const rule of rules) {
    if (rule.conditionType === 'always') return rule
    if (rule.conditionType === 'first_order' && completedOrders === 0) return rule
    if (rule.conditionType === 'min_amount' && rule.conditionValue != null && totalAmount >= rule.conditionValue) return rule
    if (rule.conditionType === 'min_orders' && rule.conditionValue != null && completedOrders >= rule.conditionValue) return rule
  }
  return null
}

async function grantOrderBonus(orderId: number, orderNumber: string, totalAmount: number, phone: string, name: string) {
  const orders: { bonusGranted: boolean }[] = await sbGet(`Order?id=eq.${orderId}&select=bonusGranted&limit=1`)
  if (orders[0]?.bonusGranted) return null

  const normalizedPhone = phone.replace(/\D/g, '')
  const variants = [phone, `+${normalizedPhone}`, normalizedPhone]
  let customerId: number | null = null
  let currentBonuses = 0

  for (const v of variants) {
    const rows: { id: number; bonuses: number }[] = await sbGet(
      `Customer?phone=eq.${encodeURIComponent(v)}&select=id,bonuses&limit=1`
    )
    if (rows.length) {
      customerId = rows[0].id
      currentBonuses = rows[0].bonuses ?? 0
      break
    }
  }

  const rule = await findMatchingBonusRule(totalAmount, customerId)
  if (!rule) return null

  const bonusAmount = Math.round(totalAmount * rule.bonusPercent / 100)

  if (customerId) {
    await sbPatch(`Customer?id=eq.${customerId}`, { bonuses: currentBonuses + bonusAmount })
  } else {
    await sbPost('Customer', { firstName: name || 'Покупатель', phone, bonuses: bonusAmount })
  }

  await sbPatch(`Order?id=eq.${orderId}`, { bonusGranted: true })

  return { bonusAmount, bonusPercent: rule.bonusPercent }
}


export async function POST(req: NextRequest) {
  const update = await req.json()

  // Нажатие кнопки оценки
  if (update.update_type === 'message_callback') {
    const cb = update.callback
    const userId: number = cb.user?.user_id
    const payload: string = cb.payload ?? ''

    if (payload.startsWith('rate:')) {
      const [, ratingStr, requestIdStr] = payload.split(':')
      const rating = parseInt(ratingStr)
      const requestId = parseInt(requestIdStr)

      await sbPatch(`ReviewRequests?id=eq.${requestId}`, {
        rating,
        status: 'replied',
      })

      await answerCallback(cb.callback_id ?? '')

      const emoji = ['😞', '😕', '😐', '🙂', '😍'][rating - 1]
      await sendText(userId, `${emoji} Спасибо за оценку ${rating}/5! Мы рады стараться для вас 🌸`)

      if (rating >= 4) {
        await sendText(
          userId,
          `Будем рады, если оставите отзыв на Яндекс Картах — это очень помогает нам развиваться 🙏\nhttps://yandex.ru/maps/org/meri/214245713508/reviews/`,
        )
      }

      if (rating <= 3) {
        const adminId = process.env.MAX_ADMIN_USER_ID
        if (adminId) {
          const rows: { recipientName: string; orderNumber: string }[] = await sbGet(
            `ReviewRequests?id=eq.${requestId}&select=recipientName,orderNumber`,
          )
          const r = rows[0]
          await sendText(
            parseInt(adminId),
            `⚠️ Низкая оценка ${rating}/5\nПокупатель: ${r?.recipientName ?? '?'}\nЗаказ: #${r?.orderNumber ?? requestId}`,
          )
        }
      }
    }

    return NextResponse.json({ ok: true })
  }

  // Входящее сообщение
  if (update.update_type === 'message_created') {
    const msg = update.message
    const userId: number = msg.sender?.user_id
    const userName: string = msg.sender?.name ?? ''
    const text: string = msg.body?.text ?? ''

    // Обработка токена из deep link (?start=tTOKEN)
    const tokenFromStart = text.startsWith('/start t') ? text.replace('/start t', '').trim() : null
    if (tokenFromStart) {
      const now = new Date().toISOString()
      const tokens: { token: string; orderNumber: string; phone: string; bonusGranted: boolean }[] = await sbGet(
        `BonusToken?token=eq.${encodeURIComponent(tokenFromStart)}&bonusGranted=eq.false&expiresAt=gt.${encodeURIComponent(now)}&limit=1`
      )
      if (tokens.length) {
        const t = tokens[0]
        const orders: { id: number; recipientPhone: string; recipientName: string; totalAmount: number; bonusGranted: boolean }[] = await sbGet(
          `Order?number=eq.${encodeURIComponent(t.orderNumber)}&select=id,recipientPhone,recipientName,totalAmount,bonusGranted&limit=1`
        )
        if (orders.length) {
          const order = orders[0]
          await upsertMaxUser(userId, order.recipientPhone, userName)
          await sbPatch(`ReviewRequests?orderId=eq.${order.id}&status=eq.pending`, { maxUserId: userId })
          const bonus = await grantOrderBonus(order.id, t.orderNumber, order.totalAmount, order.recipientPhone, order.recipientName || userName)
          await sbPatch(`BonusToken?token=eq.${encodeURIComponent(tokenFromStart)}`, { bonusGranted: true })
          if (bonus !== null) {
            await sendText(userId, `Привет, ${order.recipientName || userName}! 👋\n\n🎁 Вам начислено ${bonus.bonusAmount} бонусов за заказ ${t.orderNumber} (${bonus.bonusPercent}% от ${order.totalAmount} ₽)!\n\nБонусы можно использовать при следующей покупке в Meri Florist 🌸`)
          } else {
            await sendText(userId, `Привет, ${order.recipientName || userName}! 👋\nБонусы за заказ ${t.orderNumber} уже начислены 🌸`)
          }
        }
      } else {
        await upsertMaxUser(userId, '', userName)
        await sendContactRequest(userId)
      }
      return NextResponse.json({ ok: true })
    }

    // 4-значный код (последние 4 цифры номера заказа)
    if (/^\d{4}$/.test(text.trim())) {
      const code = text.trim()
      const recentOrders: { id: number; number: string; recipientPhone: string; recipientName: string; totalAmount: number }[] = await sbGet(
        `Order?number=like.*-${code}&bonusGranted=eq.false&select=id,number,recipientPhone,recipientName,totalAmount&order=id.desc&limit=1`
      )
      if (recentOrders.length) {
        const order = recentOrders[0]
        await upsertMaxUser(userId, order.recipientPhone, userName)
        await sbPatch(`ReviewRequests?orderId=eq.${order.id}&status=eq.pending`, { maxUserId: userId })
        const bonus = await grantOrderBonus(order.id, order.number, order.totalAmount, order.recipientPhone, order.recipientName || userName)
        if (bonus !== null) {
          await sendText(userId, `🎁 Вам начислено ${bonus.bonusAmount} бонусов за заказ ${order.number} (${bonus.bonusPercent}% от ${order.totalAmount} ₽)!\n\nБонусы можно использовать при следующей покупке в Meri Florist 🌸`)
        } else {
          await sendText(userId, `Привет, ${userName}! Бонусы за заказ ${order.number} уже начислены 🌸`)
        }
      } else {
        await sendText(userId, `Код ${code} не найден. Проверьте код на странице заказа или напишите полный номер заказа (MF-XXXXXXXX-XXXX) 🌸`)
      }
      return NextResponse.json({ ok: true })
    }

    // Обработка номера заказа (из deep link /start o или введённого вручную)
    const orderNumberFromPayload = text.startsWith('/start o') ? text.replace('/start o', '').trim() : null
    const orderNumberFromText = /^MF-\d{8}-\d{4}$/i.test(text.trim()) ? text.trim().toUpperCase() : null
    const orderNumber = orderNumberFromPayload || orderNumberFromText

    if (orderNumber) {
      const orders: { id: number; recipientPhone: string; recipientName: string; totalAmount: number; bonusGranted: boolean }[] = await sbGet(
        `Order?number=eq.${encodeURIComponent(orderNumber)}&select=id,recipientPhone,recipientName,totalAmount,bonusGranted&limit=1`,
      )

      if (orders.length) {
        const order = orders[0]
        await upsertMaxUser(userId, order.recipientPhone, userName)
        await sbPatch(`ReviewRequests?orderId=eq.${order.id}&status=eq.pending`, { maxUserId: userId })

        const bonus = await grantOrderBonus(
          order.id, orderNumber, order.totalAmount,
          order.recipientPhone, order.recipientName || userName,
        )

        if (bonus !== null) {
          await sendText(
            userId,
            `Привет, ${order.recipientName || userName}! 👋\n\n🎁 Вам начислено ${bonus.bonusAmount} бонусов за заказ ${orderNumber} (${bonus.bonusPercent}% от ${order.totalAmount} ₽)!\n\nБонусы можно использовать при следующей покупке в Meri Florist 🌸`,
          )
        } else {
          await sendText(
            userId,
            `Привет, ${order.recipientName || userName}! 👋\nБонусы за заказ ${orderNumber} уже начислены 🌸`,
          )
        }
      } else {
        await sendText(userId, `Заказ ${orderNumber} не найден. Проверьте номер и попробуйте ещё раз 🌸`)
      }

      return NextResponse.json({ ok: true })
    }

    // /start и любой другой текст — предлагаем поделиться телефоном
    await upsertMaxUser(userId, '', userName)
    await sendContactRequest(userId)
  }

  return NextResponse.json({ ok: true })
}
