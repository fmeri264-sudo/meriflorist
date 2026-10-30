import { NextRequest, NextResponse } from 'next/server'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Данные покупателя + его заказы по телефону или email
  const custRes = await fetch(`${SB}/rest/v1/Customer?id=eq.${id}`, { headers: h })
  const [customer] = await custRes.json()
  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Ищем заказы по телефону покупателя
  let orders: unknown[] = []
  if (customer.phone) {
    const ordRes = await fetch(
      `${SB}/rest/v1/Order?recipientPhone=eq.${encodeURIComponent(customer.phone)}&order=createdAt.desc&limit=50&select=id,number,createdAt,status,totalAmount,address,deliveryDate,selfPickup`,
      { headers: h }
    )
    orders = await ordRes.json().catch(() => [])
  }

  return NextResponse.json({ ...customer, orders })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const allowed = ['firstName', 'lastName', 'phone', 'email', 'address', 'comment', 'bonuses', 'points', 'holidays']
  const patch: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  const res = await fetch(`${SB}/rest/v1/Customer?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...h, Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  })

  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 400 })
  const [customer] = await res.json()
  return NextResponse.json(customer)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await fetch(`${SB}/rest/v1/Customer?id=eq.${id}`, { method: 'DELETE', headers: h })
  return NextResponse.json({ ok: true })
}
