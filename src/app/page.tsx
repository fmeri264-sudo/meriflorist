import { getSettings } from '@/lib/settings'
import OccasionsList from '@/components/home/OccasionsList'
import USPList from '@/components/home/USPList'
import HeroSection from '@/components/home/HeroSection'
import HowWeWork from '@/components/home/HowWeWork'
import FaqSection from '@/components/home/FaqSection'
import AdvantagesSection from '@/components/home/AdvantagesSection'
import ReviewsSection from '@/components/home/ReviewsSection'
import ProductsSection from '@/components/home/ProductsSection'
import BlogSection from '@/components/home/BlogSection'
import Link from 'next/link'
import Image from 'next/image'
import { getHomeSections, getProducts, getSiteReviews, getPinnedProducts, getCategories, getOccasions } from '@/lib/supabase'

export default async function HomePage() {
  const [sections, reviews, topProducts, pinnedProducts, categories, occasions, settings] = await Promise.all([
    getHomeSections().catch(() => []),
    getSiteReviews().catch(() => []),
    // Загружаем весь доступный каталог, чтобы вручную закрепленные товары
    // не терялись из-за лимита первых 60 карточек.
    getProducts({ inStock: true, limit: 700 }).catch(() => []),
    getPinnedProducts().catch(() => []),
    getCategories().catch(() => []),
    getOccasions().catch(() => []),
    getSettings(),
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
    <div className="mary-home">
      <HeroSection settings={settings} fallbackImage={topProducts.find(p => !p.isAddon && p.images?.length)?.images[0]} />
      <USPList />
      {occasions.length > 0 && <section className="mary-occasions max-w-7xl mx-auto px-4 py-10 md:py-14">
        <p className="mary-eyebrow">У каждого букета своя история</p>
        <h2 className="mb-6">По какому поводу?</h2>
        <OccasionsList occasions={occasions} />
      </section>}

      <ProductsSection title={settings.homeSelectionTitle || 'Выбор Мэри'} subtitle="Для особого повода и просто так" products={topProducts.filter(p => !p.isAddon).slice(0, 8)} linkUrl="/catalog" linkText="Все букеты →" />

      {settings.homeSeasonalImageUrl && <section className="max-w-7xl mx-auto px-4 py-8">
        <Link href={settings.homeSeasonalLink.startsWith('/') && !settings.homeSeasonalLink.startsWith('//') ? settings.homeSeasonalLink : '/catalog'} className="mary-seasonal rounded-lg overflow-hidden">
          <Image src={settings.homeSeasonalImageUrl} alt={settings.homeSeasonalTitle} fill sizes="(max-width: 767px) 100vw, 1280px" className="object-cover" />
          <div className="absolute inset-0 bg-black/35" />
          <div className="relative p-8 text-white"><h2>{settings.homeSeasonalTitle}</h2><p className="mt-4 underline underline-offset-4">Открыть подборку →</p></div>
        </Link>
      </section>}

      {/* Категории */}
      {categories.length > 0 && (
        <section className="py-6 md:py-14 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="mb-6">Найдите свой букет</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {categories.map(cat => (
                <Link key={cat.slug} href={`/catalog?category=${cat.slug}`}
                  className="relative aspect-[4/3] rounded-lg overflow-hidden group">
                  {cat.image ? (
                    <Image src={cat.image} alt={cat.name} fill sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,25vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 bg-rose-100" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900/55 via-rose-900/10 to-transparent group-hover:from-stone-900/65 group-hover:via-rose-900/15 transition-colors duration-300" />
                  <span className="absolute inset-0 flex items-center justify-center text-white font-semibold text-sm md:text-base text-center px-3 uppercase tracking-wide drop-shadow">
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
            products={products} linkUrl={s.type === 'bouquet_of_day' ? `/catalog?section=${s.id}` : s.linkUrl} linkText={s.linkText}
            bannerUrl={s.bannerUrl} highlight={s.type === 'bouquet_of_day'} />
        )
      }))}

      {settings.homeAboutText && <section className="mary-about px-4 py-12 md:py-16">
        <div className={`max-w-7xl mx-auto ${settings.homeAboutImageUrl ? 'grid md:grid-cols-2 gap-10 items-center' : 'max-w-3xl'}`}>
          {settings.homeAboutImageUrl && <div className="relative aspect-[4/3] overflow-hidden rounded-lg"><Image src={settings.homeAboutImageUrl} alt="Цветочная студия Мэри" fill sizes="(max-width: 767px) 100vw, 50vw" className="object-cover" /></div>}
          <div><p className="mary-eyebrow">Знакомьтесь, Мэри</p><h2>Ваш личный флорист</h2><p className="text-gray-700 leading-loose whitespace-pre-line">{settings.homeAboutText}</p><Link href="/contacts" className="mary-text-link inline-block mt-5">Будем на связи →</Link></div>
        </div>
      </section>}

      <HowWeWork />
      <FaqSection />
    </div>
  )
}
