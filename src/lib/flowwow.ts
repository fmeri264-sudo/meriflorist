const BASE = 'https://apis.flowwow.com'
const TOKEN = process.env.FLOWWOW_TOKEN!
const SHOP_ID = Number(process.env.FLOWWOW_SHOP_ID ?? '0')

const headers = () => ({
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
})

export interface FlowwowProduct {
  productId: number
  offerId: string
  name: string
  price: string
  discount: string
  stock: number
  available: number
  isActive: boolean
  images: string[]
  url: string
}

async function apiFetch(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    method: path.startsWith('/apiseller/stocks') || path.startsWith('/apiseller/prices')
      ? 'PUT'
      : 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Flowwow ${path}: ${res.status} — ${text}`)
  }
  return res.json()
}

export async function getFlowwowProducts(page = 1): Promise<{ items: FlowwowProduct[]; total: number }> {
  const res = await apiFetch('/apiseller/products', {
    shopId: SHOP_ID,
    limit: 50,
    page,
  }) as { items: FlowwowProduct[]; total: number }
  return res
}

export async function setOfferMappings(mappings: { productId: number; offerId: string }[]): Promise<void> {
  await apiFetch('/apiseller/products/offersMappings', {
    shopId: SHOP_ID,
    data: mappings,
  })
}

export async function syncPrices(items: { offerId: string; price: string; discount?: string }[]): Promise<void> {
  if (!items.length) return
  await fetch(`${BASE}/apiseller/prices/put`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({
      shopId: SHOP_ID,
      data: items.map(i => ({ offerId: i.offerId, price: i.price, discount: i.discount ?? '0' })),
    }),
  })
}

export async function syncStocks(items: { offerId: string; stock: number }[]): Promise<void> {
  if (!items.length) return
  await fetch(`${BASE}/apiseller/stocks/put`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({
      shopId: SHOP_ID,
      data: items,
    }),
  })
}

export { SHOP_ID as FLOWWOW_SHOP_ID }
