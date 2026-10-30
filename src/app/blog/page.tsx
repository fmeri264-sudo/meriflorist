import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBlogTags, getBlogUrl } from '@/lib/blog'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!

const CATEGORIES: Record<string, { label: string; color: string }> = {
  events: { label: 'События и акции', color: 'bg-orange-100 text-orange-700' },
  news:   { label: 'Новости',         color: 'bg-blue-100 text-blue-700' },
  tips:   { label: 'Советы',          color: 'bg-teal-100 text-teal-700' },
}

interface BlogPage {
  id: number
  slug: string
  title: string
  metaDescription?: string
  category?: string | null
  customPath?: string
  createdAt: string
  blocks: Array<{ type: string; imageUrl?: string; content?: string }>
}

async function getPages(): Promise<BlogPage[]> {
  const res = await fetch(
    `${SB}/rest/v1/Page?select=id,slug,title,metaDescription,category,customPath,createdAt,blocks&published=eq.true&category=not.is.null&order=createdAt.desc`,
    {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      next: { revalidate: 60 },
    }
  )
  if (!res.ok) return []
  return res.json()
}


function getBannerImage(page: BlogPage): string | null {
  const banner = page.blocks?.find(b => b.type === 'banner' && b.imageUrl)
  return banner?.imageUrl ?? null
}

function getExcerpt(page: BlogPage): string {
  const textBlock = page.blocks?.find(b => b.type === 'text' && b.content)
  if (!textBlock?.content) return ''
  return textBlock.content.replace(/<[^>]+>/g, '').slice(0, 120).trim() + '...'
}

export const metadata = {
  title: 'Блог — Meri Florist',
  description: 'Статьи, события и акции цветочного магазина Meri Florist',
}

export default async function BlogPage() {
  const pages = await getPages()

  const byCategory: Record<string, BlogPage[]> = {}
  for (const page of pages) {
    const cat = page.category ?? 'other'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(page)
  }

  if (pages.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">
        <p className="text-xl font-medium mb-2">Статей пока нет</p>
        <p className="text-sm">Загляните позже — скоро появятся новости и акции</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Блог</h1>

      {Object.entries(byCategory).map(([catKey, catPages]) => {
        const cat = CATEGORIES[catKey]
        if (!cat) return null
        return (
          <section key={catKey} className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${cat.color}`}>
                {cat.label}
              </span>
              <div className="flex-1 border-t border-gray-100" />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {catPages.map(page => {
                const img = getBannerImage(page)
                const excerpt = page.metaDescription || getExcerpt(page)
                return (
                  <Link
                    key={page.id}
                    href={getBlogUrl(page)}
                    className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {img && (
                      <div className="aspect-[16/9] overflow-hidden bg-gray-100">
                        <img
                          src={img}
                          alt={page.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <p className="font-semibold text-gray-900 group-hover:text-pink-500 transition-colors leading-snug mb-1">
                        {page.title}
                      </p>
                      {excerpt && (
                        <p className="text-sm text-gray-500 line-clamp-2">{excerpt}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-3">{getBlogTags(page).map(tag => <span key={tag} className="text-[11px] rounded-full bg-rose-50 text-rose-600 px-2 py-0.5">#{tag}</span>)}</div>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(page.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
