import { NextRequest, NextResponse } from 'next/server'

const SB_URL = process.env.SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }

async function sb(path: string, init?: RequestInit) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { ...h, ...(init?.headers ?? {}) } })
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
  return res
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await sb(`Product?id=eq.${id}&select=*,category:Category(id,name)&limit=1`)
  const rows = await res.json()
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await req.json()
  const row = {
    name: data.name, slug: data.slug, description: data.description || null,
    composition: data.composition || null, price: Number(data.price),
    images: data.images ?? [], video: data.video || null,
    inStock: data.inStock ?? true, isHit: data.isHit ?? false, isNew: data.isNew ?? false,
    tags: data.tags ?? [],
    categoryIds: data.categoryIds ?? (data.categoryId ? [Number(data.categoryId)] : []),
    categoryId: data.categoryIds?.[0] ?? Number(data.categoryId) ?? null,
    sectionIds: data.sectionIds ?? [],
    occasionIds: data.occasionIds ?? [],
    colors: data.colors ?? [],
    packaging: data.packaging ?? null,
    flowerCount: data.flowerCount ?? null,
    popularInDistricts: data.popularInDistricts ?? [],
    width: data.width ?? null,
    height: data.height ?? null,
    groupId: data.groupId ?? null,
    isAddon: data.isAddon ?? false,
    addonCategory: data.addonCategory ?? null,
    isVisible: data.isVisible ?? true,
  }
  const res = await sb(`Product?id=eq.${id}`, {
    method: 'PATCH', body: JSON.stringify(row),
    headers: { ...h, Prefer: 'return=representation' },
  })
  const rows = await res.json()
  return NextResponse.json(rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sb(`Product?id=eq.${id}`, { method: 'DELETE' })
  return NextResponse.json({ ok: true })
}
