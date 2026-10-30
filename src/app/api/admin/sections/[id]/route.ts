import { NextRequest, NextResponse } from 'next/server'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await req.json()
  const res = await fetch(`${SB}/rest/v1/HomeSection?id=eq.${id}`, {
    method: 'PATCH', headers: { ...h, Prefer: 'return=representation' },
    body: JSON.stringify(data),
  })
  return NextResponse.json((await res.json())[0])
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await fetch(`${SB}/rest/v1/HomeSection?id=eq.${id}`, { method: 'DELETE', headers: h })
  return NextResponse.json({ ok: true })
}
