import { NextRequest, NextResponse } from 'next/server'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await req.json()
  const res = await fetch(`${SB}/rest/v1/SiteReview?id=eq.${id}`, {
    method: 'PATCH', headers: { ...h, Prefer: 'return=representation' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return NextResponse.json({ error: `Не удалось сохранить отзыв: HTTP ${res.status}` }, { status: 502 })
  const rows = await res.json()
  if (!rows[0]) return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await fetch(`${SB}/rest/v1/SiteReview?id=eq.${id}`, { method: 'DELETE', headers: h })
  return NextResponse.json({ ok: true })
}
