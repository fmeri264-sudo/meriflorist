import { NextRequest, NextResponse } from 'next/server'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

// POST { productId, sectionId, add: boolean }
export async function POST(req: NextRequest) {
  const { productId, sectionId, add } = await req.json()
  if (!productId || !sectionId) return NextResponse.json({ error: 'productId and sectionId required' }, { status: 400 })

  const res = await fetch(`${SB}/rest/v1/Product?id=eq.${productId}&select=sectionIds&limit=1`, { headers: h })
  const rows: { sectionIds: number[] }[] = await res.json()
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const current: number[] = rows[0].sectionIds ?? []
  const updated = add
    ? current.includes(sectionId) ? current : [...current, sectionId]
    : current.filter(id => id !== sectionId)

  await fetch(`${SB}/rest/v1/Product?id=eq.${productId}`, {
    method: 'PATCH',
    headers: { ...h, Prefer: 'return=minimal' },
    body: JSON.stringify({ sectionIds: updated }),
  })

  return NextResponse.json({ ok: true })
}
