import { NextRequest, NextResponse } from 'next/server'
import { changeOrderStatus, orderRequest, refreshDeliveryStatuses } from '@/lib/order-lifecycle'
import { findMaxUserByPhone, sendText } from '@/lib/max-bot'

function authorized(req: NextRequest) {
  const token = process.env.MERIBUKET_API_TOKEN
  return !!token && req.headers.get('authorization') === `Bearer ${token}`
}
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  try {
    await refreshDeliveryStatuses()
    return NextResponse.json(await (await orderRequest('select=number,status&order=id.desc&limit=1000')).json())
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 502 }) }
}
export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  try {
    const { number, status, photoUrl } = await req.json()
    if (photoUrl) {
      const url = new URL(photoUrl)
      if (url.origin !== new URL(process.env.MERIBUKET_URL || 'https://meribuket.ru').origin) throw new Error('Invalid photo origin')
    }
    const order = await changeOrderStatus(number, status)
    let maxSent = false
    if (photoUrl) {
      const userId = await findMaxUserByPhone(order.recipientPhone)
      if (userId) {
        await sendText(userId, `Ваш букет собран! 🌸 Заказ ${number}\nФото: ${photoUrl}`)
        maxSent = true
      }
    }
    return NextResponse.json({ ok: true, maxSent })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 502 }) }
}
