import { NextRequest, NextResponse } from 'next/server'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

async function sb(path: string, init?: RequestInit) {
  const res = await fetch(`${SB}/rest/v1/${path}`, { ...init, headers: { ...h, ...(init?.headers ?? {}) } })
  return res
}

export async function GET() {
  const res = await sb('Page?select=id,slug,title,metaTitle,published,showInHeader,showInFooter,headerLabel,customPath,category,createdAt&order=id.desc')
  if (!res.ok) {
    const err = await res.text()
    // Table may not exist yet
    if (res.status === 404 || err.includes('does not exist') || err.includes('relation') || err.includes('42P01')) {
      return NextResponse.json({ pages: [], tableExists: false })
    }
    return NextResponse.json({ pages: [], tableExists: true })
  }
  const pages = await res.json()
  return NextResponse.json({ pages, tableExists: true })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { slug, title } = body
  if (!slug || !title) return NextResponse.json({ error: 'slug и title обязательны' }, { status: 400 })

  const res = await sb('Page', {
    method: 'POST',
    body: JSON.stringify({
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      title: title.trim(),
      published: false,
      showInHeader: false,
      showInFooter: false,
      category: body.category ?? null,
      blocks: [],
    }),
    headers: { Prefer: 'return=representation' },
  })

  if (!res.ok) {
    const err = await res.text()
    if (err.includes('unique') || err.includes('duplicate')) {
      return NextResponse.json({ error: 'Страница с таким slug уже существует' }, { status: 409 })
    }
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const rows = await res.json()
  return NextResponse.json(rows[0])
}
