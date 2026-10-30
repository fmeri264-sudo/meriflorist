import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getPublishedPage } from '@/lib/pages'
import type { Block } from '@/lib/pages'
import { formatPrice } from '@/lib/utils'
import { getBlogTags, getBlogUrl, getRelatedBlogs, type BlogSummary } from '@/lib/blog'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}` }

type PageWithCategory = import('@/lib/pages').Page & { category?: string | null }

interface Product {
  id: number; name: string; slug: string; price: number; images: string[]
}

async function getBlogPages(): Promise<BlogSummary[]> {
  try {
    const res = await fetch(`${SB}/rest/v1/Page?select=id,slug,title,metaDescription,category,customPath,createdAt,blocks&published=eq.true&category=not.is.null&order=createdAt.desc`, { headers: h, next: { revalidate: 60 } })
    return res.ok ? await res.json() : []
  } catch { return [] }
}

async function getProductsByIds(ids: number[]): Promise<Product[]> {
  if (!ids.length) return []
  const joined = ids.slice(0, 12).join(',')
  try {
    const res = await fetch(
      `${SB}/rest/v1/Product?id=in.(${joined})&select=id,name,slug,price,images`,
      { headers: h, cache: 'no-store' },
    )
    return res.ok ? await res.json() : []
  } catch { return [] }
}

function HeadingBlock({ block }: { block: Extract<Block, { type: 'heading' }> }) {
  const cls = 'font-bold text-gray-900 my-4'
  if (block.level === 1) return <h1 className={`${cls} text-4xl`}>{block.text}</h1>
  if (block.level === 3) return <h3 className={`${cls} text-2xl`}>{block.text}</h3>
  return <h2 className={`${cls} text-3xl`}>{block.text}</h2>
}

function TextBlock({ block }: { block: Extract<Block, { type: 'text' }> }) {
  return (
    <div
      className="prose prose-gray max-w-none text-gray-700 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: block.content }}
    />
  )
}

function BannerBlock({ block }: { block: Extract<Block, { type: 'banner' }> }) {
  const hasText = block.title || block.subtitle || block.buttonText
  return (
    <div className="relative rounded-2xl overflow-hidden min-h-[320px] flex items-center justify-center my-6">
      {block.imageUrl && (
        <Image src={block.imageUrl} alt={block.title ?? ''} fill className="object-cover" />
      )}
      {block.overlay && <div className="absolute inset-0 bg-gradient-to-t from-stone-900/55 via-rose-900/10 to-transparent" />}
      {hasText && (
        <div className="relative z-10 text-center px-8 py-12 max-w-2xl mx-auto">
          {block.title && <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">{block.title}</h2>}
          {block.subtitle && <p className="text-lg text-white/90 mb-6">{block.subtitle}</p>}
          {block.buttonText && block.buttonUrl && (
            <Link href={block.buttonUrl}
              className="inline-block bg-rose-500 hover:bg-rose-600 text-white font-semibold px-8 py-3 rounded-full transition">
              {block.buttonText}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

async function ProductsBlock({ block }: { block: Extract<Block, { type: 'products' }> }) {
  const products = await getProductsByIds(block.productIds ?? [])
  if (!products.length) return null
  return (
    <div className="my-8">
      {block.title && <h2 className="text-2xl font-bold text-gray-900 mb-5">{block.title}</h2>}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map(p => (
          <Link key={p.id} href={`/catalog/${p.slug}`}
            className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative aspect-square bg-gray-50 overflow-hidden">
              {p.images[0] ? (
                <Image src={p.images[0]} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">🌸</div>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-gray-900 truncate group-hover:text-rose-500 transition-colors">{p.name}</p>
              <p className="text-base font-bold text-gray-900 mt-1">{formatPrice(p.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

async function RenderBlock({ block }: { block: Block }) {
  if (block.type === 'heading') return <HeadingBlock block={block} />
  if (block.type === 'text') return <TextBlock block={block} />
  if (block.type === 'banner') return <BannerBlock block={block} />
  if (block.type === 'products') return <ProductsBlock block={block} />
  return null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const page = await getPublishedPage(slug)
  if (!page) return {}
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
  }
}

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await getPublishedPage(slug)
  if (!page) notFound()

  const blogPages = await getBlogPages()
  const summary = { id: page.id, slug: page.slug, title: page.title, metaDescription: page.metaDescription, customPath: page.customPath, createdAt: page.createdAt, category: (page as PageWithCategory).category, blocks: page.blocks }
  const related = getRelatedBlogs(summary, blogPages)
  const tags = getBlogTags(summary)
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex flex-wrap gap-1 mb-6">{tags.map(tag => <span key={tag} className="text-xs rounded-full bg-rose-50 text-rose-600 px-2.5 py-1">#{tag}</span>)}</div>
      {page.blocks.map(block => (
        <RenderBlock key={block.id} block={block} />
      ))}
      {related.length > 0 && <section className="mt-12 border-t pt-8"><h2 className="text-2xl font-bold mb-5">Читайте также</h2><div className="grid gap-4 sm:grid-cols-3">{related.map(item => <Link key={item.id} href={getBlogUrl(item)} className="rounded-xl border p-4 hover:shadow-md"><div className="font-semibold text-gray-900">{item.title}</div><div className="text-xs text-gray-500 mt-2">{getBlogTags(item).slice(0, 3).map(t => `#${t}`).join(' · ')}</div></Link>)}</div></section>}
    </div>
  )
}
