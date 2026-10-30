import { NextRequest, NextResponse } from 'next/server'
import { collectMarketReviews } from '@/lib/yandex-market-reviews'
import { getAdminToken } from '@/lib/admin-auth'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

// Load existing review texts to avoid duplicates
async function getExistingKeys(): Promise<Set<string>> {
  const keys = new Set<string>()
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${SB}/rest/v1/SiteReview?select=id,author,text&order=id.asc&offset=${offset}&limit=1000`, {
      headers: h, cache: 'no-store', signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) throw new Error(`Не удалось получить сохранённые отзывы: HTTP ${res.status}`)
    const rows: { author: string; text: string }[] = await res.json()
    if (!Array.isArray(rows)) throw new Error('Некорректный ответ базы отзывов')
    for (const r of rows) keys.add(`${r.author}|${r.text.slice(0, 50)}`)
    if (rows.length < 1000) break
  }
  return keys
}

async function saveReviews(reviews: {
  author: string; text: string; rating: number
  source: string; productName?: string
}[]) {
  if (!reviews.length) return 0
  const res = await fetch(`${SB}/rest/v1/SiteReview`, {
    method: 'POST',
    headers: { ...h, Prefer: 'return=minimal' },
    body: JSON.stringify(reviews.map(r => ({
      author: r.author,
      text: r.text,
      rating: r.rating,
      source: r.source,
      productName: r.productName ?? null,
      visible: false,
    }))),
  })
  if (!res.ok) throw new Error(`Не удалось сохранить отзывы: HTTP ${res.status}`)
  return reviews.length
}

// ── Яндекс Маркет ───────────────────────────────────────────────────────────
async function syncYM(existing: Set<string>) {
  const productNames = new Map<string, string>()
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${SB}/rest/v1/Product?sku=not.is.null&select=sku,name&order=id.asc&offset=${offset}&limit=1000`, {
      headers: h, cache: 'no-store', signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) throw new Error(`Не удалось получить названия букетов: HTTP ${res.status}`)
    const products: { sku: string; name: string }[] = await res.json()
    if (!Array.isArray(products)) throw new Error('Некорректный ответ каталога букетов')
    for (const product of products) {
      if (product.sku?.trim() && product.name?.trim()) productNames.set(product.sku.trim(), product.name.trim())
    }
    if (products.length < 1000) break
  }
  const { reviews, ...result } = await collectMarketReviews(existing, productNames)
  return { added: await saveReviews(reviews), ...result }
}

// ── Ozon ─────────────────────────────────────────────────────────────────────
async function syncOzon(existing: Set<string>) {
  const clientId = process.env.OZON_CLIENT_ID
  const apiKey = process.env.OZON_API_KEY
  if (!clientId || !apiKey) return { added: 0, error: 'No Ozon credentials' }

  const reviews: Parameters<typeof saveReviews>[0] = []
  const h = { 'Client-Id': clientId, 'Api-Key': apiKey, 'Content-Type': 'application/json' }

  let offset = 0
  const limit = 100

  for (let page = 0; page < 10; page++) {
    try {
      const res = await fetch('https://api-seller.ozon.ru/v1/review/list', {
        method: 'POST', headers: h,
        body: JSON.stringify({ sort_dir: 'DESC', limit, offset }),
      })
      if (!res.ok) return { added: await saveReviews(reviews), error: `Ozon API ${res.status}` }

      const data = await res.json()
      const items: Record<string, unknown>[] = data.reviews ?? []
      if (!items.length) break

      for (const item of items) {
        const rating = (item.rating as number) ?? 0
        if (rating < 4) continue
        const text = ((item.text as string) ?? '').trim()
        if (!text || text.length < 5) continue
        // Ozon reviews are anonymous — use generic author
        const author = 'Покупатель Ozon'
        const key = `ozon|${text.slice(0, 50)}`
        if (existing.has(key)) continue
        existing.add(key)
        reviews.push({ author, text, rating, source: 'ozon' })
      }

      if (items.length < limit) break
      offset += limit
    } catch (e) {
      return { added: await saveReviews(reviews), error: String(e) }
    }
  }

  const added = await saveReviews(reviews)
  return { added }
}

// ── Wildberries ───────────────────────────────────────────────────────────────
async function syncWB(existing: Set<string>) {
  const token = process.env.WB_API_TOKEN
  if (!token) return { added: 0, error: 'No WB credentials' }

  const reviews: Parameters<typeof saveReviews>[0] = []
  const authHeader = { Authorization: token }

  // Try both answered and unanswered feedbacks
  for (const isAnswered of [true, false]) {
    let skip = 0
    for (let page = 0; page < 5; page++) {
      try {
        const res = await fetch(
          `https://feedbacks-api.wildberries.ru/api/v1/feedbacks?isAnswered=${isAnswered}&take=100&skip=${skip}&order=dateDesc`,
          { headers: authHeader }
        )
        if (!res.ok) break
        const data = await res.json()
        const feedbacks: Record<string, unknown>[] = data?.data?.feedbacks ?? []
        if (!feedbacks.length) break

        for (const fb of feedbacks) {
          const rating = (fb.productValuation as number) ?? 0
          if (rating < 4) continue
          const author = (fb.userName as string) ?? 'Покупатель WB'
          const text = ((fb.text as string) ?? '').trim()
          if (!text || text.length < 10) continue
          const key = `${author}|${text.slice(0, 50)}`
          if (existing.has(key)) continue
          existing.add(key)
          reviews.push({
            author,
            text,
            rating,
            source: 'wb',
            productName: (fb.subjectName as string) ?? undefined,
          })
        }
        skip += 100
      } catch { break }
    }
  }

  const added = await saveReviews(reviews)
  return { added: added, ...(added === 0 ? { note: 'No WB reviews with text found' } : {}) }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (req.cookies.get('admin_session')?.value !== await getAdminToken()) {
    return NextResponse.json({ error: 'Требуется вход администратора' }, { status: 401 })
  }
  const { source } = await req.json().catch(() => ({ source: 'all' }))
  if (!['all', 'ym', 'ozon', 'wb'].includes(source)) {
    return NextResponse.json({ error: 'Неизвестный источник отзывов' }, { status: 400 })
  }
  try {
    const existing = await getExistingKeys()
    const results: Record<string, unknown> = {}
    if (source === 'all' || source === 'ym') results.ym = await syncYM(existing)
    if (source === 'all' || source === 'ozon') results.ozon = await syncOzon(existing)
    if (source === 'all' || source === 'wb') results.wb = await syncWB(existing)
    return NextResponse.json(results)
  } catch (e) {
    return NextResponse.json({ [source]: { added: 0, error: e instanceof Error ? e.message : 'Ошибка импорта отзывов' } }, { status: 502 })
  }
}
