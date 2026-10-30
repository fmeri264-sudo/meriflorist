import { NextRequest, NextResponse } from 'next/server'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

async function sb(path: string, init?: RequestInit) {
  return fetch(`${SB}/rest/v1/${path}`, { ...init, headers: { ...h, ...(init?.headers ?? {}) } })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await sb(`Page?id=eq.${id}&limit=1`)
  if (!res.ok) return NextResponse.json({ error: 'Ошибка' }, { status: 500 })
  const rows = await res.json()
  if (!rows.length) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const patch: Record<string, unknown> = {}
  if (body.title !== undefined) patch.title = body.title
  if (body.slug !== undefined) patch.slug = body.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  if (body.metaTitle !== undefined) patch.metaTitle = body.metaTitle
  if (body.metaDescription !== undefined) patch.metaDescription = body.metaDescription
  if (body.published !== undefined) patch.published = body.published
  if (body.showInHeader !== undefined) patch.showInHeader = body.showInHeader
  if (body.showInFooter !== undefined) patch.showInFooter = body.showInFooter
  if (body.headerLabel !== undefined) patch.headerLabel = body.headerLabel
  if (body.blocks !== undefined) patch.blocks = body.blocks
  if (body.category !== undefined) patch.category = body.category || null
  if (body.customPath !== undefined) {
    patch.customPath = body.customPath
      ? body.customPath.replace(/^\/+/, '').replace(/\/+$/, '') || null
      : null
  }
  patch.updatedAt = new Date().toISOString()

  const res = await sb(`Page?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
    headers: { Prefer: 'return=representation' },
  })

  if (!res.ok) {
    const err = await res.text()
    if (err.includes('unique') || err.includes('duplicate')) {
      if (err.includes('customPath') || err.includes('custom_path')) {
        return NextResponse.json({ error: 'Такой прямой URL уже занят другой страницей' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Такой slug уже занят' }, { status: 409 })
    }
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const rows = await res.json()
  return NextResponse.json(rows[0])
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sb(`Page?id=eq.${id}`, { method: 'DELETE' })
  return NextResponse.json({ ok: true })
}
