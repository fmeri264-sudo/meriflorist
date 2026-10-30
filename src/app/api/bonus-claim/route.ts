import { NextRequest, NextResponse } from 'next/server'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

function randomToken() {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

export async function POST(req: NextRequest) {
  const { orderNumber } = await req.json()
  if (!orderNumber) return NextResponse.json({ error: 'orderNumber required' }, { status: 400 })

  // Ищем заказ по номеру
  const orderRes = await fetch(
    `${SB}/rest/v1/Order?number=eq.${encodeURIComponent(orderNumber)}&select=id,recipientPhone,totalAmount&limit=1`,
    { headers: h, cache: 'no-store' }
  )
  const orders = orderRes.ok ? await orderRes.json() : []
  if (!orders.length) return NextResponse.json({ error: 'order not found' }, { status: 404 })

  const order = orders[0]
  const token = randomToken()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 часа

  await fetch(`${SB}/rest/v1/BonusToken`, {
    method: 'POST',
    headers: { ...h, Prefer: 'return=minimal' },
    body: JSON.stringify({ token, orderNumber, phone: order.recipientPhone, bonusGranted: false, expiresAt }),
  })

  return NextResponse.json({ token })
}
