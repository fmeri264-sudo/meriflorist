const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

export type Block =
  | { id: string; type: 'text'; content: string }
  | { id: string; type: 'banner'; imageUrl: string; title?: string; subtitle?: string; buttonText?: string; buttonUrl?: string; overlay?: boolean }
  | { id: string; type: 'products'; title?: string; productIds?: number[] }
  | { id: string; type: 'heading'; text: string; level?: 1 | 2 | 3 }

export interface Page {
  id: number
  slug: string
  title: string
  metaTitle?: string
  metaDescription?: string
  published: boolean
  showInHeader: boolean
  showInFooter: boolean
  headerLabel?: string
  customPath?: string
  blocks: Block[]
  createdAt: string
  updatedAt?: string
}

export interface PageNav {
  id: number
  slug: string
  title: string
  headerLabel?: string
  showInHeader: boolean
  showInFooter: boolean
  customPath?: string
}

export function getPageUrl(page: Pick<PageNav, 'slug' | 'customPath'>): string {
  return page.customPath ? `/${page.customPath}` : `/pages/${page.slug}`
}

export async function getPublishedPageNavs(): Promise<PageNav[]> {
  try {
    const res = await fetch(
      `${SB}/rest/v1/Page?select=id,slug,title,headerLabel,showInHeader,showInFooter,customPath&published=eq.true&order=id.asc`,
      { headers: h, cache: 'no-store' },
    )
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function getPublishedPage(slug: string): Promise<Page | null> {
  try {
    const res = await fetch(
      `${SB}/rest/v1/Page?slug=eq.${encodeURIComponent(slug)}&published=eq.true&limit=1`,
      { headers: h, cache: 'no-store' },
    )
    if (!res.ok) return null
    const rows: Page[] = await res.json()
    return rows[0] ?? null
  } catch {
    return null
  }
}

export async function getPublishedPageByCustomPath(customPath: string): Promise<Page | null> {
  try {
    const res = await fetch(
      `${SB}/rest/v1/Page?customPath=eq.${encodeURIComponent(customPath)}&published=eq.true&limit=1`,
      { headers: h, cache: 'no-store' },
    )
    if (!res.ok) return null
    const rows: Page[] = await res.json()
    return rows[0] ?? null
  } catch {
    return null
  }
}
