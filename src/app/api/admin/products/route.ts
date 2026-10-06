import { NextRequest, NextResponse } from 'next/server'

const SB_URL = process.env.SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_ANON_KEY!
const headers = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }

async function sb(path: string, init?: RequestInit) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init?.headers ?? {}) } })
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
  return res
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const sectionId = searchParams.get('sectionId')
  const inStock = searchParams.get('inStock')
  const isVisible = searchParams.get('isVisible')
  const isHit = searchParams.get('isHit')
  const isNew = searchParams.get('isNew')
  const categoryId = searchParams.get('categoryId')
  const limitParam = parseInt(searchParams.get('limit') ?? '0')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = limitParam > 0 ? Math.min(limitParam, 1000) : 20
  const offset = (page - 1) * limit

  const filters: string[] = []
  if (search) filters.push(`or=(name.ilike.*${encodeURIComponent(search)}*,sku.ilike.*${encodeURIComponent(search)}*)`)
  if (sectionId) filters.push(`sectionIds=cs.{${sectionId}}`)
  if (inStock === 'true' || inStock === 'false') filters.push(`inStock=eq.${inStock}`)
  if (isVisible === 'true' || isVisible === 'false') filters.push(`isVisible=eq.${isVisible}`)
  if (isHit === 'true' || isHit === 'false') filters.push(`isHit=eq.${isHit}`)
  if (isNew === 'true' || isNew === 'false') filters.push(`isNew=eq.${isNew}`)
  if (categoryId && /^\d+$/.test(categoryId)) filters.push(`categoryId=eq.${categoryId}`)
  const filter = filters.length > 0 ? filters.join('&') + '&' : ''

  const [dataRes, countRes] = await Promise.all([
    sb(`Product?${filter}select=*,category:Category(id,name)&order=id.desc&limit=${limit}&offset=${offset}`),
    sb(`Product?${filter}select=count`, { headers: { ...headers, Prefer: 'count=exact' } }),
  ])

  const products = await dataRes.json()
  const total = parseInt(countRes.headers.get('content-range')?.split('/')[1] ?? '0')

  return NextResponse.json({ products, total, page, limit })
}

export async function POST(req: NextRequest) {
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
  const res = await sb('Product', {
    method: 'POST', body: JSON.stringify(row),
    headers: { ...headers, Prefer: 'return=representation' },
  })

  // 📢 Обновляем карту сайта
  try {
    await fetch('https://meriflorist.ru/api/revalidate?secret=Yjdbxjr_1803!', {
      method: 'POST'
    });
    console.log('✅ Карта сайта обновлена!');
  } catch (error) {
    console.error('❌ Ошибка обновления карты:', error);
  }

  return NextResponse.json(await res.json(), { status: 201 })
}
 
