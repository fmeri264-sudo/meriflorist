import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { collectMarketReviews } from '../src/lib/yandex-market-reviews'

const originalFetch = globalThis.fetch
const originalEnv = { ...process.env }
afterEach(() => {
  globalThis.fetch = originalFetch
  for (const key of ['YM_API_KEY', 'YM_OAUTH_TOKEN', 'YM_BUSINESS_ID']) {
    if (originalEnv[key] === undefined) delete process.env[key]
    else process.env[key] = originalEnv[key]
  }
})
function setup() {
  process.env.YM_OAUTH_TOKEN = 'test-token'
  process.env.YM_BUSINESS_ID = '123'
  delete process.env.YM_API_KEY
}
const feedback = (author: string, comment: string, rating = 5) => ({
  author, description: { comment }, statistics: { rating }, identifiers: { offerId: 'SKU-1' },
})

test('reads subsequent pages, comments and short text; filters and deduplicates', async () => {
  setup()
  let calls = 0
  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input))
    assert.equal(url.pathname, '/v2/businesses/123/goods-feedback')
    assert.equal(url.searchParams.get('limit'), '50')
    assert.deepEqual(JSON.parse(options!.body as string), { ratingValues: [4, 5] })
    assert.equal((options!.headers as Record<string, string>).Authorization, 'Bearer test-token')
    calls++
    assert.equal(url.searchParams.get('pageToken'), calls === 1 ? null : 'second')
    return Response.json({ result: {
      feedbacks: calls === 1
        ? [feedback('А', 'Спасибо!'), feedback('Б', 'Плохо', 2)]
        : [feedback('А', 'Спасибо!'), feedback('В', 'Хорошо', 4)],
      paging: calls === 1 ? { nextPageToken: 'second' } : {},
    } })
  }
  const result = await collectMarketReviews(new Set(), new Map([['SKU-1', 'Букет из роз']]), globalThis.fetch)
  assert.equal(result.error, undefined)
  assert.equal(result.pages, 2)
  assert.deepEqual(result.reviews.map(r => r.text), ['Спасибо!', 'Хорошо'])
  assert.deepEqual(result.reviews.map(r => r.productName), ['Букет из роз', 'Букет из роз'])
})

test('does not duplicate reviews imported before comment support', async () => {
  setup()
  globalThis.fetch = async () => Response.json({ result: { feedbacks: [{
    ...feedback('А', 'Дополнительный комментарий'),
    description: { advantages: 'Прекрасный букет', comment: 'Дополнительный комментарий' },
  }] } })
  assert.equal((await collectMarketReviews(new Set(['А|Прекрасный букет']), new Map(), globalThis.fetch)).reviews.length, 0)
})

test('preserves collected reviews when a later page fails', async () => {
  setup()
  let calls = 0
  globalThis.fetch = async () => ++calls === 1
    ? Response.json({ result: { feedbacks: [feedback('А', 'Отлично')], paging: { nextPageToken: 'next' } } })
    : Response.json({ errors: [{ code: 'FORBIDDEN' }] }, { status: 403 })
  const result = await collectMarketReviews(new Set(), new Map(), globalThis.fetch)
  assert.equal(result.reviews.length, 1)
  assert.match(result.error!, /403.*FORBIDDEN/)
})

test('detects repeated pagination tokens', async () => {
  setup()
  globalThis.fetch = async () => Response.json({ result: { feedbacks: [], paging: { nextPageToken: 'same' } } })
  const result = await collectMarketReviews(new Set(), new Map(), globalThis.fetch)
  assert.equal(result.pages, 2)
  assert.match(result.error!, /повторил страницу/)
})

test('uses Api-Key when configured', async () => {
  setup()
  process.env.YM_API_KEY = 'test-key'
  globalThis.fetch = async (_, options) => {
    assert.equal((options!.headers as Record<string, string>)['Api-Key'], 'test-key')
    assert.equal((options!.headers as Record<string, string>).Authorization, undefined)
    return Response.json({ result: { feedbacks: [] } })
  }
  assert.equal((await collectMarketReviews(new Set(), new Map(), globalThis.fetch)).error, undefined)
})

test('does not display a SKU when the bouquet is absent from the catalog', async () => {
  setup()
  globalThis.fetch = async () => Response.json({ result: { feedbacks: [feedback('А', 'Спасибо')] } })
  const result = await collectMarketReviews(new Set(), new Map(), globalThis.fetch)
  assert.equal(result.reviews[0].productName, undefined)
})


test('retries a transient connection failure without losing the page', async () => {
  setup()
  let attempts = 0
  const transport: typeof fetch = async () => {
    if (++attempts === 1) throw new TypeError('fetch failed')
    return Response.json({ result: { feedbacks: [feedback('А', 'Спасибо')] } })
  }
  const result = await collectMarketReviews(new Set(), new Map(), transport)
  assert.equal(attempts, 2)
  assert.equal(result.error, undefined)
  assert.equal(result.reviews.length, 1)
})
