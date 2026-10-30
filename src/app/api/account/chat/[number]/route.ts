import { NextRequest, NextResponse } from 'next/server'

const MB_URL = process.env.MERIBUKET_URL!
const MB_TOKEN = process.env.MERIBUKET_API_TOKEN!
const SB_URL = process.env.SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

async function verifyOrderOwner(orderNumber: string, phone: string): Promise<boolean> {
  const clean = phone.replace(/\D/g, '')
  const variants = [clean, `+${clean}`, `+7${clean.slice(1)}`]
  const filter = variants.map(v => `recipientPhone.eq.${encodeURIComponent(v)}`).join(',')
  const res = await fetch(
    `${SB_URL}/rest/v1/Order?number=eq.${orderNumber}&or=(${filter})&select=id&limit=1`,
    { headers: h }
  )
  if (!res.ok) return false
  const rows = await res.json()
  return rows.length > 0
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  const { number } = await params
  const phone = req.nextUrl.searchParams.get('phone') ?? ''
  if (!phone || !number) return NextResponse.json({ error: 'missing params' }, { status: 400 })

  const owned = await verifyOrderOwner(number, phone)
  if (!owned) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const res = await fetch(`${MB_URL}/api/ext/chat/${number}?token=${MB_TOKEN}`)
  if (!res.ok) return NextResponse.json({ messages: [] })
  return NextResponse.json(await res.json())
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  const { number } = await params
  const body = await req.json()
  const { phone, message } = body
  if (!phone || !message || !number) return NextResponse.json({ error: 'missing params' }, { status: 400 })

  const owned = await verifyOrderOwner(number, phone)
  if (!owned) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const res = await fetch(`${MB_URL}/api/ext/chat/${number}/buyer-send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MB_TOKEN}` },
    body: JSON.stringify({ message }),
  })
  if (!res.ok) return NextResponse.json({ error: 'send failed' }, { status: 500 })
  return NextResponse.json(await res.json())
}
