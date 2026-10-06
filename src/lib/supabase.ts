const URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!
const KEY = (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
}

async function get(table: string, query: string) {
  const res = await fetch(`${URL}/rest/v1/${table}?${query}`, { headers, cache: 'no-store' })
  if (!res.ok) throw new Error(`Supabase ${table}: ${res.status}`)
  return res.json()
}

export interface DbOccasion {
  id: number
  name: string
  slug: string
  sort: number
}

export async function getOccasions(): Promise<DbOccasion[]> {
  return get('Occasion', 'order=sort.asc')
}

export interface DbProduct {
  id: number
  name: string
  slug: string
  description: string | null
  composition: string | null
  price: number
  images: string[]
  video: string | null
  inStock: boolean
  isHit: boolean
  isNew: boolean
  isVisible: boolean
  tags: string[]
  categoryId: number
  sectionIds: number[]
  occasionIds: number[]
  colors: string[]
  packaging: string | null
  flowerCount: number | null
  width: number | null
  height: number | null
  groupId: string | null
  isAddon: boolean
  addonCategory: string | null
  sku: string | null
  category?: { id: number; name: string; slug: string }
}

export interface DbCategory {
  id: number
  name: string
  slug: string
  image?: string
  sort: number
}

export async function getProducts(params: {
  categorySlug?: string
  sectionId?: number
  isHit?: boolean
  inStock?: boolean
  isAddon?: boolean
  priceMin?: number
  priceMax?: number
  sort?: string
  limit?: number
  occasionId?: number
  color?: string
  packaging?: string
  flowerCountMin?: number
  flowerCountMax?: number
  search?: string
}): Promise<DbProduct[]> {
  const filters: string[] = []

  filters.push('isVisible=eq.true')
  if (params.inStock !== false) filters.push('inStock=eq.true')
  if (params.isAddon === true) filters.push('isAddon=eq.true')
  if (params.isHit) filters.push('isHit=eq.true')
  if (params.sectionId) filters.push(`sectionIds=cs.%7B${params.sectionId}%7D`)
  if (params.priceMin) filters.push(`price=gte.${params.priceMin}`)
  if (params.priceMax) filters.push(`price=lte.${params.priceMax}`)
  if (params.occasionId) filters.push(`occasionIds=cs.%7B${params.occasionId}%7D`)
  if (params.color) filters.push(`colors=cs.${encodeURIComponent(JSON.stringify([params.color]))}`)
  if (params.packaging) filters.push(`packaging=eq.${encodeURIComponent(params.packaging)}`)
  if (params.flowerCountMin) filters.push(`flowerCount=gte.${params.flowerCountMin}`)
  if (params.flowerCountMax) filters.push(`flowerCount=lte.${params.flowerCountMax}`)
  if (params.search?.trim()) {
    const term = encodeURIComponent(params.search.trim())
    filters.push(`or=(name.ilike.*${term}*,sku.ilike.*${term}*)`)
  }

  let orderBy = 'id.desc'
  if (params.sort === 'price_asc') orderBy = 'price.asc'
  if (params.sort === 'price_desc') orderBy = 'price.desc'

  const limit = params.limit ?? 60
  if (params.categorySlug && params.categorySlug !== 'hits') {
    const cats = await get('Category', `slug=eq.${params.categorySlug}&select=id&limit=1`)
    const catId = cats[0]?.id
    if (catId) filters.push(`categoryIds=cs.%7B${catId}%7D`)
  }

  const query = [
    `select=*,category:Category(id,name,slug)`,
    ...filters,
    `order=${orderBy}`,
    `limit=${limit}`,
  ].join('&')

  return get('Product', query)
}

export async function getProductBySlug(slug: string): Promise<DbProduct | null> {
  const rows = await get('Product', `slug=eq.${slug}&select=*,category:Category(id,name,slug)&limit=1`)
  return rows[0] ?? null
}

export async function getProductsByGroupId(groupId: string): Promise<DbProduct[]> {
  return get('Product', `groupId=eq.${encodeURIComponent(groupId)}&inStock=eq.true&select=*&order=flowerCount.asc,height.asc,id.asc`)
}

export async function getCategories(): Promise<DbCategory[]> {
  return get('Category', 'order=sort.asc')
}

export interface DbSection {
  id: number
  title: string
  subtitle: string | null
  type: string
  bannerUrl: string | null
  linkUrl: string | null
  linkText: string | null
  visible: boolean
  sort: number
  config: Record<string, unknown>
}

export interface DbReview {
  id: number
  author: string
  text: string
  rating: number
  source: string
  productName: string | null
  visible: boolean
  createdAt: string
}

export async function getHomeSections(): Promise<DbSection[]> {
  return get('HomeSection', 'visible=eq.true&order=sort.asc')
}

export async function getSiteReviews(): Promise<DbReview[]> {
  return get('SiteReview', 'visible=eq.true&order=createdAt.desc&limit=12')
}

export async function getPinnedProducts(): Promise<DbProduct[]> {
  return get('Product', 'inStock=eq.true&sectionIds=neq.%7B%7D&select=*,category:Category(id,name,slug)')
}
