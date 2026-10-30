import Link from 'next/link'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!

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

async function getBlogPages(): Promise<BlogPage[]> {
  const res = await fetch(
    `${SB}/rest/v1/Page?select=id,slug,title,metaDescription,category,customPath,createdAt,blocks&published=eq.true&category=eq.events&order=createdAt.desc&limit=6`,
    {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      next: { revalidate: 60 },
    }
  )
  if (!res.ok) return []
  return res.json()
}

function getPageUrl(page: BlogPage) {
  return page.customPath ? `/${page.customPath}` : `/pages/${page.slug}`
}

function getBannerImage(page: BlogPage): string | null {
  return page.blocks?.find(b => b.type === 'banner' && b.imageUrl)?.imageUrl ?? null
}

function getExcerpt(page: BlogPage): string {
  const content = page.blocks?.find(b => b.type === 'text')?.content ?? ''
  return content.replace(/<[^>]+>/g, '').slice(0, 110).trim()
}

export default async function BlogSection({ title }: { title: string }) {
  const pages = await getBlogPages()
  if (!pages.length) return null

  return (
    <section className="py-10 md:py-14 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h2>
          <Link href="/blog" className="text-rose-500 font-medium hover:underline text-sm">
            Все статьи →
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map(page => {
            const img = getBannerImage(page)
            const excerpt = page.metaDescription || getExcerpt(page)
            return (
              <Link
                key={page.id}
                href={getPageUrl(page)}
                className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {img ? (
                  <div className="aspect-[16/9] overflow-hidden bg-gray-100">
                    <img
                      src={img}
                      alt={page.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/9] bg-rose-50 flex items-center justify-center">
                    <span className="text-4xl">🌸</span>
                  </div>
                )}
                <div className="p-4">
                  <p className="font-semibold text-gray-900 group-hover:text-rose-500 transition-colors leading-snug mb-1">
                    {page.title}
                  </p>
                  {excerpt && (
                    <p className="text-sm text-gray-500 line-clamp-2">{excerpt}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-3">
                    {new Date(page.createdAt).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
