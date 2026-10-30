import { request } from 'node:https'

// Use the native HTTPS client: Node 20's fetch intermittently times out on Market POSTs.
async function marketFetch(input: Parameters<typeof fetch>[0], init: RequestInit = {}): Promise<Response> {
  return new Promise((resolve, reject) => {
    const req = request(new URL(String(input)), {
      method: init.method,
      headers: Object.fromEntries(new Headers(init.headers)),
      family: 4,
      signal: init.signal ?? undefined,
    }, res => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('error', reject)
      res.on('end', () => resolve(new Response(Buffer.concat(chunks).toString('utf8'), {
        status: res.statusCode ?? 502,
      })))
    })
    req.on('error', reject)
    req.end(init.body as string)
  })
}

export interface ImportedMarketReview {
  author: string
  text: string
  rating: number
  source: string
  productName?: string
}

interface MarketFeedback {
  author?: string
  description?: { advantages?: string; disadvantages?: string; comment?: string }
  statistics?: { rating?: number }
  identifiers?: { offerId?: string }
}

export async function collectMarketReviews(existing: Set<string>, productNames: ReadonlyMap<string, string> = new Map(), transport: typeof fetch = marketFetch) {
  const apiKey = process.env.YM_API_KEY?.trim()
  const token = process.env.YM_OAUTH_TOKEN?.trim()
  const businessId = process.env.YM_BUSINESS_ID?.trim() || '18473444'
  const reviews: ImportedMarketReview[] = []
  let pages = 0
  let scanned = 0
  try {
    if (!apiKey && !token) throw new Error('Не настроен токен Яндекс Маркета')
    if (!/^\d+$/.test(businessId)) throw new Error('Некорректный YM_BUSINESS_ID')
    const body = JSON.stringify({ ratingValues: [4, 5] })
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(body)),
    }
    if (apiKey) headers['Api-Key'] = apiKey
    else headers.Authorization = `Bearer ${token}`
    let pageToken: string | undefined
    const visited = new Set<string>()
    do {
      const url = new URL(`https://api.partner.market.yandex.ru/v2/businesses/${businessId}/goods-feedback`)
      url.searchParams.set('limit', '50')
      if (pageToken) url.searchParams.set('pageToken', pageToken)
      let res: Response | undefined
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          res = await transport(url, {
            method: 'POST', headers, body,
            cache: 'no-store', signal: AbortSignal.timeout(30_000),
          })
          if (res.status !== 429 && res.status < 500) break
        } catch (error) {
          if (attempt === 2) throw new Error('Не удалось соединиться с Яндекс Маркетом. Повторите импорт позже.', { cause: error })
        }
        if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
      }
      if (!res) throw new Error('Яндекс Маркет не ответил')
      const data = await res.json()
      if (!res.ok || data.status === 'ERROR') {
        const codes = (data.errors ?? []).map((e: { code?: string }) => e.code).filter(Boolean).join(', ')
        throw new Error(`Яндекс Маркет: HTTP ${res.status}${codes ? ` (${codes})` : ''}`)
      }
      if (!Array.isArray(data.result?.feedbacks)) throw new Error('Некорректный ответ Яндекс Маркета')
      const feedbacks: MarketFeedback[] = data.result.feedbacks
      pages++
      scanned += feedbacks.length
      for (const fb of feedbacks) {
        const rating = fb.statistics?.rating ?? 0
        if (rating !== 4 && rating !== 5) continue
        const desc = fb.description
        const parts = [desc?.advantages, desc?.disadvantages, desc?.comment]
          .filter((part): part is string => typeof part === 'string' && !!part.trim())
          .map(part => part.trim())
        const text = [...new Set(parts)].join(' | ')
        if (!text) continue
        const author = fb.author?.trim() || 'Покупатель'
        const key = `${author}|${text.slice(0, 50)}`
        // Recognize reviews imported before the comment field was supported.
        const oldText = [desc?.advantages, desc?.disadvantages].filter(Boolean).join(' | ').trim()
        const oldKey = `${author}|${oldText.slice(0, 50)}`
        if (existing.has(key) || (oldText.length >= 10 && existing.has(oldKey))) continue
        existing.add(key)
        const offerId = fb.identifiers?.offerId
        reviews.push({ author, text, rating, source: 'ym', productName: offerId ? productNames.get(offerId) : undefined })
      }
      pageToken = data.result.paging?.nextPageToken || undefined
      if (pageToken) {
        if (visited.has(pageToken)) throw new Error('Яндекс Маркет повторил страницу отзывов')
        visited.add(pageToken)
        if (pages >= 200) throw new Error('Достигнут лимит страниц импорта отзывов')
      }
    } while (pageToken)
    return { reviews, pages, scanned }
  } catch (e) {
    return { reviews, pages, scanned, error: e instanceof Error ? e.message : 'Ошибка импорта Яндекс Маркета' }
  }
}
