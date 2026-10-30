import { NextRequest, NextResponse } from 'next/server'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

const PAGES = [
  { slug: 'rules',   title: 'Правила сайта' },
  { slug: 'privacy', title: 'Политика конфиденциальности' },
  { slug: 'oferta',  title: 'Оферта сайта' },
  { slug: 'consent', title: 'Согласие на обработку данных' },
  { slug: 'vozvrat', title: 'Возврат и обмен' },
]

export async function GET() {
  const res = await fetch(`${SB}/rest/v1/LegalPage?order=slug.asc`, { headers: h, cache: 'no-store' })
  const rows: { slug: string; title: string; content: string }[] = res.ok ? await res.json() : []

  // Если таблица пустая — вернуть дефолтный список с пустым контентом
  if (!rows.length) {
    return NextResponse.json(PAGES.map(p => ({ ...p, content: '' })))
  }
  return NextResponse.json(rows)
}

export async function PUT(req: NextRequest) {
  const { slug, content } = await req.json()
  const page = PAGES.find(p => p.slug === slug)
  if (!page) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Upsert через Supabase REST
  const res = await fetch(`${SB}/rest/v1/LegalPage?slug=eq.${slug}`, {
    method: 'PATCH',
    headers: { ...h, Prefer: 'return=representation' },
    body: JSON.stringify({ content }),
  })

  const rows = await res.json()
  if (!rows.length) {
    // Запись ещё не существует — создаём
    const ins = await fetch(`${SB}/rest/v1/LegalPage`, {
      method: 'POST',
      headers: { ...h, Prefer: 'return=representation' },
      body: JSON.stringify({ slug, title: page.title, content }),
    })
    return NextResponse.json((await ins.json())[0])
  }
  return NextResponse.json(rows[0])
}
