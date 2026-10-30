const BASE = 'https://platform-api.max.ru'
const TOKEN = process.env.MAX_BOT_TOKEN ?? ''

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const SB_H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

async function api(path: string, userId: number, body: object) {
  const url = new URL(`${BASE}${path}`)
  url.searchParams.set('user_id', String(userId))
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { Authorization: TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`MAX API ${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function sendText(userId: number, text: string) {
  return api('/messages', userId, { text })
}

export async function sendContactRequest(userId: number) {
  return api('/messages', userId, {
    text: 'Привет! 👋\n\nЧтобы начислить бонусы за ваш заказ, отправьте мне 4-значный код со страницы «Заказ оформлен» на сайте meriflorist.ru 🎁\n\nПример: если ваш заказ MF-20260516-1234, то код — 1234',
  })
}

export async function sendRatingRequest(userId: number, name: string, requestId: number) {
  return api('/messages', userId, {
    text: `${name}, спасибо за заказ в Meri Florist! 🌸\n\nПожалуйста, оцените нашу доставку от 1 до 5:`,
    attachments: [{
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [1, 2, 3, 4, 5].map(n => ({
            type: 'callback',
            text: ['😞', '😕', '😐', '🙂', '😍'][n - 1] + ` ${n}`,
            payload: `rate:${n}:${requestId}`,
          })),
        ],
      },
    }],
  })
}

export async function answerCallback(callbackId: string) {
  await fetch(`${BASE}/answers`, {
    method: 'POST',
    headers: { Authorization: TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_id: callbackId }),
  })
}

// Сохранить/обновить MAX user в базе
export async function upsertMaxUser(maxUserId: number, phone: string, name: string) {
  await fetch(`${SB}/rest/v1/MaxUsers`, {
    method: 'POST',
    headers: { ...SB_H, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ maxUserId, phone, name }),
  })
}

// Найти maxUserId по телефону
export async function findMaxUserByPhone(phone: string): Promise<number | null> {
  const normalized = phone.replace(/\D/g, '')
  const variants = [normalized, `+${normalized}`, `8${normalized.slice(1)}`]
  for (const v of variants) {
    const res = await fetch(
      `${SB}/rest/v1/MaxUsers?phone=eq.${encodeURIComponent(v)}&select=maxUserId&limit=1`,
      { headers: SB_H, cache: 'no-store' },
    )
    if (res.ok) {
      const rows: { maxUserId: number }[] = await res.json()
      if (rows.length) return rows[0].maxUserId
    }
  }
  return null
}

// Создать запрос на отзыв
export async function scheduleReviewRequest(opts: {
  orderId: number
  orderNumber?: string
  recipientName: string
  recipientPhone: string
  delayMinutes?: number
}) {
  const scheduledAt = new Date(Date.now() + (opts.delayMinutes ?? 90) * 60 * 1000).toISOString()
  const maxUserId = await findMaxUserByPhone(opts.recipientPhone)

  await fetch(`${SB}/rest/v1/ReviewRequests`, {
    method: 'POST',
    headers: { ...SB_H, Prefer: 'return=minimal' },
    body: JSON.stringify({
      orderId: opts.orderId,
      orderNumber: opts.orderNumber ?? null,
      recipientName: opts.recipientName,
      recipientPhone: opts.recipientPhone,
      maxUserId,
      scheduledAt,
      status: 'pending',
    }),
  })
}
