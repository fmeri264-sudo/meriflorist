import { NextRequest, NextResponse } from 'next/server'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

export async function GET(req: NextRequest) {
  const phone = new URL(req.url).searchParams.get('phone')
  if (!phone) return NextResponse.json([])

  const digits = phone.replace(/\D/g, '')
  const variants = [digits, `+${digits}`, `8${digits.slice(1)}`]

  let orders: object[] = []
  for (const v of variants) {
    const res = await fetch(
      `${SB}/rest/v1/Order?recipientPhone=eq.${encodeURIComponent(v)}&select=id,number,createdAt,status,totalAmount,address,selfPickup&order=id.desc&limit=50`,
      { headers: h, cache: 'no-store' }
    )
    if (res.ok) {
      const rows = await res.json()
      if (rows.length) { orders = rows; break }
    }
  }

  return NextResponse.json(orders)
}
