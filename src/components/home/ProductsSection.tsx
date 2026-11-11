import Link from 'next/link'
import ProductCard from '@/components/catalog/ProductCard'
import { DbProduct } from '@/lib/supabase'

interface Props {
  title: string
  subtitle?: string | null
  products: DbProduct[]
  linkUrl?: string | null
  linkText?: string | null
  bannerUrl?: string | null
  highlight?: boolean
}

export default function ProductsSection({ title, subtitle, products, linkUrl, linkText, bannerUrl, highlight }: Props) {
  if (!products.length) return null
  return (
    <section className={`py-6 md:py-14 px-4 ${highlight ? 'bg-rose-50/30' : ''}`}>
      <div className="max-w-7xl mx-auto">
        {bannerUrl && (
          <div className="relative rounded-2xl overflow-hidden mb-4 md:mb-8 h-40">
            <img src={bannerUrl} alt={title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30 flex items-center px-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
                {subtitle && <p className="text-white/80 mt-1">{subtitle}</p>}
              </div>
            </div>
          </div>
        )}

        {!bannerUrl && (
          <div className="flex items-center justify-between mb-4 md:mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h2>
              {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
            </div>
            {linkUrl && (
              <Link href={linkUrl} className="text-rose-500 font-medium hover:underline text-sm">
                {linkText ?? 'Смотреть все →'}
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map(p => (
            <ProductCard key={p.id} product={p as any} showPhotoDots />
          ))}
        </div>

        {bannerUrl && linkUrl && (
          <div className="text-center mt-6">
            <Link href={linkUrl} className="inline-block bg-rose-500 text-white px-6 py-2.5 rounded-full font-medium hover:bg-rose-600 transition text-sm">
              {linkText ?? 'Смотреть все →'}
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
