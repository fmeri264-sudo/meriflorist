import { NextResponse } from 'next/server'
import { DISTRICTS } from '@/lib/districts'
import { revalidatePath } from 'next/cache'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

interface Props { params: Promise<{ slug: string }> }

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params
  try {
    const res = await fetch(
      `${SB}/rest/v1/Districts?slug=eq.${encodeURIComponent(slug)}&select=data&limit=1`,
      { headers: H, cache: 'no-store' },
    )
    if (res.ok) {
      const rows: { data: object }[] = await res.json()
      if (rows.length > 0) return NextResponse.json(rows[0].data)
    }
  } catch { /* fallback */ }
  const fallback = DISTRICTS.find(d => d.slug === slug)
  if (!fallback) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(fallback)
}

export async function PUT(req: Request, { params }: Props) {
  const { slug } = await params
  const data = await req.json()
  const res = await fetch(`${SB}/rest/v1/Districts`, {
    method: 'POST',
    headers: {
      ...H,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ slug, data }),
  })
  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }
  revalidatePath(`/dostavka-cvetov/${slug}`)
  return NextResponse.json({ ok: true })
}
