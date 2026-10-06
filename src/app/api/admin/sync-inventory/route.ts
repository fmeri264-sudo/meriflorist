import { NextResponse } from 'next/server'
import { fetchCatalog } from '@/lib/meribuket'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

export async function POST(req: Request) {
  const expected = process.env.INVENTORY_SYNC_SECRET
  if (!expected || req.headers.get('x-inventory-sync-secret') !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const catalog = await fetchCatalog()
  if (!catalog.length) {
    return NextResponse.json({ error: 'Не удалось получить данные с meribuket.ru' }, { status: 502 })
  }

  // Загружаем все продукты со SKU
  const res = await fetch(`${SB}/rest/v1/Product?sku=not.is.null&select=id,sku,price,inStock`, {
    headers: h,
    cache: 'no-store',
  })
  if (!res.ok) return NextResponse.json({ error: 'Supabase error' }, { status: 500 })
  const products: { id: number; sku: string; price: number; inStock: boolean }[] = await res.json()

  const skuMap = new Map(catalog.map(c => [c.sku, c]))
  let updated = 0
  let matched = 0
  let missing = 0

  for (const p of products) {
    const ext = skuMap.get(p.sku)
    if (!ext) { missing++; continue }
    matched++

    const newInStock = ext.in_stock
    const newPrice = ext.retail_price ?? p.price
    if (newInStock === p.inStock && newPrice === p.price) continue

    await fetch(`${SB}/rest/v1/Product?id=eq.${p.id}`, {
      method: 'PATCH',
      headers: { ...h, Prefer: 'return=minimal' },
      body: JSON.stringify({ inStock: newInStock, price: newPrice }),
    })
    updated++
  }

  return NextResponse.json({
    ok: true,
    catalog_items: catalog.length,
    products_total: products.length,
    products_matched: matched,
    products_missing_in_catalog: missing,
    updated,
  })
}
