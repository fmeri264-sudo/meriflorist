import { NextRequest, NextResponse } from 'next/server'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

export async function GET(req: NextRequest) {
  const phone = new URL(req.url).searchParams.get('phone')
  if (!phone) return NextResponse.json(null)

  const res = await fetch(
    `${SB}/rest/v1/SavedCart?phone=eq.${encodeURIComponent(phone)}&limit=1`,
    { headers: h }
  )
  if (!res.ok) return NextResponse.json(null)
  const rows = await res.json()
  return NextResponse.json(rows[0] ?? null)
}

export async function POST(req: NextRequest) {
  const { phone, items, total } = await req.json()
  if (!phone) return NextResponse.json({ error: 'phone обязателен' }, { status: 400 })

  // Upsert by phone
  const res = await fetch(`${SB}/rest/v1/SavedCart`, {
    method: 'POST',
    headers: { ...h, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ phone, items: items ?? [], total: total ?? 0, updatedAt: new Date().toISOString() }),
  })

  return res.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: await res.text() }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  const phone = new URL(req.url).searchParams.get('phone')
  if (!phone) return NextResponse.json({ ok: true })
  await fetch(`${SB}/rest/v1/SavedCart?phone=eq.${encodeURIComponent(phone)}`, { method: 'DELETE', headers: h })
  return NextResponse.json({ ok: true })
}
