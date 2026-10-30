import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

export async function GET() {
  const res = await fetch(`${SB}/rest/v1/SiteSettings?select=key,value`, {
    headers: h,
    cache: 'no-store',
  })
  const rows: { key: string; value: string }[] = res.ok ? await res.json() : []
  const obj = Object.fromEntries(rows.map(r => [r.key, r.value]))
  return NextResponse.json(obj)
}

export async function PUT(req: NextRequest) {
  const { key, value } = await req.json()
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

  const patch = await fetch(`${SB}/rest/v1/SiteSettings?key=eq.${encodeURIComponent(key)}`, {
    method: 'PATCH',
    headers: { ...h, Prefer: 'return=representation' },
    body: JSON.stringify({ value }),
  })
  const patched = await patch.json()

  if (!Array.isArray(patched) || !patched.length) {
    await fetch(`${SB}/rest/v1/SiteSettings`, {
      method: 'POST',
      headers: { ...h, Prefer: 'return=minimal' },
      body: JSON.stringify({ key, value }),
    })
  }

  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true })
}
