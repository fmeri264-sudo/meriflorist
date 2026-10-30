import { NextRequest, NextResponse } from 'next/server'
import { findMaxUserByPhone, sendText } from '@/lib/max-bot'

const SB_URL = process.env.SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { photoUrl, message } = await req.json() as { photoUrl: string; message?: string }

  if (!photoUrl) return NextResponse.json({ error: 'photoUrl обязателен' }, { status: 400 })

  // Загружаем заказ
  const orderRes = await fetch(
    `${SB_URL}/rest/v1/Order?id=eq.${id}&select=recipientPhone,recipientName,number&limit=1`,
    { headers: h },
  )
  if (!orderRes.ok) return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
  const rows: { recipientPhone: string; recipientName: string; number: string }[] = await orderRes.json()
  if (!rows.length) return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
  const order = rows[0]

  const text = message?.trim() ||
    `${order.recipientName ? order.recipientName + ', ваш' : 'Ваш'} букет готов! 🌸\n\nПосмотреть фото: ${photoUrl}`

  // Ищем MAX-аккаунт покупателя
  const maxUserId = await findMaxUserByPhone(order.recipientPhone)
  if (!maxUserId) {
    return NextResponse.json({ error: 'Покупатель не зарегистрирован в MAX' }, { status: 200 })
  }

  try {
    await sendText(maxUserId, text)
    const syncToken = process.env.MERIBUKET_API_TOKEN
    if (syncToken) {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://meriflorist.ru'}/api/integration/orders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${syncToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: order.number, status: 'CONFIRMED', photoUrl }),
      }).catch(() => {})
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
