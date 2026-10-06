import HeroSection from '@/components/home/HeroSection'
import HowWeWork from '@/components/home/HowWeWork'
import FaqSection from '@/components/home/FaqSection'
import AdvantagesSection from '@/components/home/AdvantagesSection'
import ReviewsSection from '@/components/home/ReviewsSection'
import ProductsSection from '@/components/home/ProductsSection'
import BlogSection from '@/components/home/BlogSection'
import Link from 'next/link'
import Image from 'next/image'
import { getHomeSections, getProducts, getSiteReviews, getPinnedProducts, getCategories } from '@/lib/supabase'

export default async function HomePage() {
  const [sections, reviews, topProducts, pinnedProducts, categories] = await Promise.all([
    getHomeSections().catch(() => []),
    getSiteReviews().catch(() => []),
    getProducts({ inStock: true, limit: 60 }).catch(() => []),
    getPinnedProducts().catch(() => []),
    getCategories().catch(() => []),
  ])

  const topIds = new Set(topProducts.map(p => p.id))
  const allProducts = [...topProducts, ...pinnedProducts.filter(p => !topIds.has(p.id))]

  function getSection(sectionId: number, type: string, config: Record<string, unknown>) {
    if (type === 'reviews' || type === 'advantages' || type === 'blog') return []
    const limit = (config.limit as number) || 0
    const pinnedIds = (config.pinnedProductIds as number[]) ?? []

    const products = pinnedIds.length > 0
      ? pinnedIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean) as typeof allProducts
      : allProducts.filter(p => p.sectionIds?.includes(sectionId))

    return limit > 0 ? products.slice(0, limit) : products
  }

  return (
    <>
      <HeroSection />

      {/* Категории */}
      {categories.length > 0 && (
        <section className="py-6 md:py-14 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map(cat => (
                <Link key={cat.slug} href={`/catalog?category=${cat.slug}`}
                  className="relative aspect-square rounded-2xl overflow-hidden group">
                  {cat.image ? (
                    <Image src={cat.image} alt={cat.name} fill sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,25vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 bg-rose-100" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900/55 via-rose-900/10 to-transparent group-hover:from-stone-900/65 group-hover:via-rose-900/15 transition-colors duration-300" />
                  <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg md:text-xl text-center px-3 uppercase tracking-wide drop-shadow">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Динамические секции из БД */}
      {await Promise.all(sections.map(async s => {
        if (s.type === 'advantages') {
          const items = (s.config.items as { icon: string; title: string; text: string }[]) ?? []
          return <AdvantagesSection key={s.id} title={s.title} items={items} />
        }
        if (s.type === 'reviews') {
          return <ReviewsSection key={s.id} title={s.title} reviews={reviews} />
        }
        if (s.type === 'blog') return <BlogSection key={s.id} title={s.title} />
        const products = getSection(s.id, s.type, s.config)
        if (!products.length) return null
        return (
          <ProductsSection key={s.id} title={s.title} subtitle={s.subtitle}
            products={products} linkUrl={s.linkUrl} linkText={s.linkText}
            bannerUrl={s.bannerUrl} highlight={s.type === 'bouquet_of_day'} />
        )
      }))}

      <HowWeWork />
      <FaqSection />
    </>
  )
}
