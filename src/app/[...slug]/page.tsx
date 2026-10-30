import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getPublishedPageByCustomPath } from '@/lib/pages'
import type { Block } from '@/lib/pages'
import { formatPrice } from '@/lib/utils'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}` }

interface Product {
  id: number; name: string; slug: string; price: number; images: string[]
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
      {block.overlay && <div className="absolute inset-0 bg-black/50" />}
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params
  const customPath = slug.join('/')
  const page = await getPublishedPageByCustomPath(customPath)
  if (!page) return {}
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
  }
}

export default async function CustomPathPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const customPath = slug.join('/')
  const page = await getPublishedPageByCustomPath(customPath)
  if (!page) notFound()

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {page.blocks.map(block => (
        <RenderBlock key={block.id} block={block} />
      ))}
    </div>
  )
}
