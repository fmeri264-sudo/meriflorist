import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Clock, Truck, Phone, ChevronRight } from 'lucide-react'
import { DISTRICTS, getDistrictData, getOtherDistricts } from '@/lib/districts'
import { getProducts } from '@/lib/supabase'
import ProductCard from '@/components/catalog/ProductCard'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return DISTRICTS.map(d => ({ slug: d.slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const district = await getDistrictData(slug)
  if (!district) return {}
  return {
    title: district.metaTitle,
    description: district.metaDescription,
    alternates: { canonical: `/dostavka-cvetov/${district.slug}` },
  }
}

export default async function DistrictPage({ params }: Props) {
  const { slug } = await params
  const district = await getDistrictData(slug)
  if (!district) notFound()

  const others = getOtherDistricts(slug)

  const SB = process.env.SUPABASE_URL!
  const KEY = process.env.SUPABASE_ANON_KEY!
  const SB_H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

  // Ищем по имени района (как хранится в БД) и по слагу (как сохраняет форма)
  const nameEncoded = encodeURIComponent(JSON.stringify([district.name]))
  const slugEncoded = encodeURIComponent(JSON.stringify([slug]))
  const [resByName, resBySlug] = await Promise.all([
    fetch(`${SB}/rest/v1/Product?popularInDistricts=cs.${nameEncoded}&inStock=eq.true&select=*&limit=8`, { headers: SB_H, cache: 'no-store' }),
    fetch(`${SB}/rest/v1/Product?popularInDistricts=cs.${slugEncoded}&inStock=eq.true&select=*&limit=8`, { headers: SB_H, cache: 'no-store' }),
  ])
  const byName: { id: number }[] = resByName.ok ? await resByName.json() : []
  const bySlug: { id: number }[] = resBySlug.ok ? await resBySlug.json() : []
  const seen = new Set(byName.map(p => p.id))
  const districtProducts = [...byName, ...bySlug.filter(p => !seen.has(p.id))]

  let featured = districtProducts.slice(0, 4)
  if (featured.length < 4) {
    const allProducts = await getProducts({ inStock: true, limit: 60 })
    const hits = allProducts.filter((p: { id: number; isHit: boolean }) => p.isHit && !districtProducts.some((d: { id: number }) => d.id === p.id))
    featured = [...featured, ...hits].slice(0, 4)
  }

  const businessLd = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'Florist'],
    '@id': `https://meriflorist.ru/dostavka-cvetov/${district.slug}#business`,
    name: `Meri Florist — доставка цветов ${district.nameRod}`,
    description: district.metaDescription,
    url: `https://meriflorist.ru/dostavka-cvetov/${district.slug}`,
    telephone: '+78001234567',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Санкт-Петербург',
      addressRegion: district.name,
      addressCountry: 'RU',
    },
    areaServed: { '@type': 'Place', name: district.name },
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
      opens: '08:00',
      closes: '22:00',
    }],
    priceRange: '790₽–15000₽',
    // Зоны доставки с DeliveryChargeSpecification
    makesOffer: district.zones.map(z => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: `Доставка цветов — ${z.name}`,
        provider: { '@type': 'Organization', name: 'Яндекс.Доставка' },
      },
      priceSpecification: [
        {
          '@type': 'DeliveryChargeSpecification',
          name: `Доставка в ${z.name}`,
          price: z.price,
          priceCurrency: 'RUB',
          eligibleRegion: { '@type': 'Place', name: z.name },
          eligibleTransactionVolume: {
            '@type': 'PriceSpecification',
            maxPrice: z.freeFrom - 1,
            priceCurrency: 'RUB',
          },
          deliveryTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 2,
            unitCode: 'HUR',
          },
        },
        {
          '@type': 'DeliveryChargeSpecification',
          name: `Бесплатная доставка в ${z.name} от ${z.freeFrom} ₽`,
          price: 0,
          priceCurrency: 'RUB',
          eligibleRegion: { '@type': 'Place', name: z.name },
          eligibleTransactionVolume: {
            '@type': 'PriceSpecification',
            minPrice: z.freeFrom,
            priceCurrency: 'RUB',
          },
        },
      ],
    })),
  }

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: district.faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(businessLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <main className="max-w-5xl mx-auto px-4 py-10">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
          <Link href="/" className="hover:text-pink-500">Главная</Link>
          <ChevronRight size={14} />
          <span className="text-gray-600">Доставка цветов {district.nameRod}</span>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-3">
            {district.h1}
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">{district.subtitle}</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-pink-50 rounded-xl p-4">
            <Clock size={20} className="text-pink-500 mb-2" />
            <p className="text-xs text-gray-500 mb-0.5">Время доставки</p>
            <p className="font-bold text-gray-900">{district.deliveryTime}</p>
          </div>
          <div className="bg-pink-50 rounded-xl p-4">
            <Truck size={20} className="text-pink-500 mb-2" />
            <p className="text-xs text-gray-500 mb-0.5">Доставка от</p>
            <p className="font-bold text-gray-900">{Math.min(...district.zones.map(z => z.price))} ₽</p>
          </div>
          <div className="bg-pink-50 rounded-xl p-4">
            <MapPin size={20} className="text-pink-500 mb-2" />
            <p className="text-xs text-gray-500 mb-0.5">Мин. заказ</p>
            <p className="font-bold text-gray-900">790 ₽</p>
          </div>
          <div className="bg-pink-50 rounded-xl p-4">
            <Phone size={20} className="text-pink-500 mb-2" />
            <p className="text-xs text-gray-500 mb-0.5">Работаем</p>
            <p className="font-bold text-gray-900">8:00–22:00</p>
          </div>
        </div>

        {/* Intro + neighborhoods */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-8">
          <p className="text-gray-700 mb-4 leading-relaxed">{district.intro}</p>
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-2">Районы доставки:</p>
            <div className="flex flex-wrap gap-2">
              {district.neighborhoods.map(n => (
                <span key={n} className="bg-gray-50 border border-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
                  {n}
                </span>
              ))}
            </div>
          </div>
          {district.trafficNote && (
            <p className="mt-4 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              🚦 {district.trafficNote}
            </p>
          )}
        </div>

        {/* Delivery zones table */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Зоны доставки {district.nameRod}</h2>
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Зона</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Время</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Стоимость</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Бесплатно от</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {district.zones.map((z, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-gray-800">{z.name}</td>
                    <td className="px-5 py-3 text-gray-600">{z.time}</td>
                    <td className="px-5 py-3 font-medium">{z.price} ₽</td>
                    <td className="px-5 py-3 text-green-600 font-medium">{z.freeFrom.toLocaleString('ru')} ₽</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Featured products */}
        {featured.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Популярные букеты с доставкой {district.nameRod}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featured.map((p: { id: number }) => (
                <ProductCard key={p.id} product={p as any} />
              ))}
            </div>
            <div className="text-center mt-6">
              <Link
                href="/catalog"
                className="inline-flex items-center gap-2 border border-pink-300 text-pink-600 hover:bg-pink-50 px-6 py-2.5 rounded-xl text-sm font-medium transition"
              >
                Весь каталог <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        )}

        {/* Body text */}
        <div className="mb-10 prose prose-gray max-w-none">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Доставка цветов {district.nameRod} — как это работает
          </h2>
          <div className="text-gray-700 leading-relaxed space-y-4">
            {district.bodyText.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-pink-500 to-rose-400 rounded-2xl p-8 text-center text-white mb-10">
          <p className="text-xl font-bold mb-2">Заказать доставку {district.nameRod}</p>
          <p className="text-pink-100 mb-6 text-sm">Свежие цветы — за {district.deliveryTime}. Без предоплаты или картой онлайн.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/catalog"
              className="bg-white text-pink-600 font-semibold px-8 py-3 rounded-xl hover:bg-pink-50 transition text-sm"
            >
              Выбрать букет
            </Link>
            <a
              href="tel:+78001234567"
              className="border border-white/60 text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/10 transition text-sm"
            >
              Позвонить
            </a>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Частые вопросы</h2>
          <div className="space-y-2">
            {district.faqs.map((faq, i) => (
              <details key={i} className="bg-white border border-gray-100 rounded-xl group">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none font-medium text-gray-800 hover:text-pink-600 transition">
                  {faq.q}
                  <ChevronRight size={16} className="text-gray-400 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>

        {/* Other districts */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Доставка цветов в другие районы СПб</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {others.map(d => (
              <Link
                key={d.slug}
                href={`/dostavka-cvetov/${d.slug}`}
                className="flex items-center justify-between bg-white border border-gray-100 hover:border-pink-200 hover:bg-pink-50/30 rounded-xl px-4 py-3 transition group"
              >
                <div>
                  <p className="font-medium text-gray-800 group-hover:text-pink-600 transition text-sm">{d.name}</p>
                  <p className="text-xs text-gray-400">{d.deliveryTime}</p>
                </div>
                <ChevronRight size={15} className="text-gray-300 group-hover:text-pink-400 transition" />
              </Link>
            ))}
          </div>
        </div>

      </main>
    </>
  )
}
