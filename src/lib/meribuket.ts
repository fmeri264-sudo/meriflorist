const BASE = process.env.MERIBUKET_URL || 'https://meribuket.ru'
const TOKEN = process.env.MERIBUKET_API_TOKEN || ''

const headers = () => ({
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
})

export interface CatalogItem {
  sku: string
  name: string
  available: number
  in_stock: boolean
  retail_price: number | null
}

export async function fetchCatalog(): Promise<CatalogItem[]> {
  if (!TOKEN) return []
  try {
    const res = await fetch(`${BASE}/api/ext/catalog`, {
      headers: headers(),
      next: { revalidate: 0 },
    })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function notifyOrder(order: {
  order_number: string
  sku: string
  item_name: string
  quantity: number
  total_price: number
  recipient_name: string
  recipient_phone: string
  address: string
  delivery_date: string
  comment: string
  photo_url: string
  warehouse?: string
}): Promise<boolean> {
  if (!TOKEN) return false
  try {
    const res = await fetch(`${BASE}/api/ext/order`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(order),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function notifyDelivered(orderNumber: string): Promise<boolean> {
  if (!TOKEN) return false
  try {
    const res = await fetch(`${BASE}/api/ext/order/${encodeURIComponent(orderNumber)}/delivered`, {
      method: 'POST',
      headers: headers(),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function notifyCancel(orderNumber: string): Promise<boolean> {
  if (!TOKEN) return false
  try {
    const res = await fetch(`${BASE}/api/ext/order/${encodeURIComponent(orderNumber)}/cancel`, {
      method: 'POST',
      headers: headers(),
    })
    return res.ok
  } catch {
    return false
  }
}
