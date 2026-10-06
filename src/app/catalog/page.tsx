import { getProducts, getOccasions, getHomeSections } from '@/lib/supabase'
import ProductCard from '@/components/catalog/ProductCard'
import CatalogFilters from '@/components/catalog/CatalogFilters'
import { Suspense } from 'react'
import { Product } from '@/types'

const FLOWER_COUNT_RANGES = [
  { label: 'до 9', min: 1, max: 9 },
  { label: '10–24', min: 10, max: 24 },
  { label: '25–49', min: 25, max: 49 },
  { label: '50–99', min: 50, max: 99 },
  { label: '100+', min: 100, max: undefined },
]

interface Props {
  searchParams: Promise<{
    category?: string
    section?: string
    occasion?: string
    sort?: string
    priceMin?: string
    priceMax?: string
    color?: string
    packaging?: string
    flowers?: string
    search?: string
  }>
}

async function fetchProducts(
  params: Awaited<Props['searchParams']>,
  occasionId?: number,
) {
  try {
    const isBudget = params.category === 'budget'
    const isHits = params.sort === 'hits' || params.category === 'hits'

    const flowerRange = params.flowers
      ? FLOWER_COUNT_RANGES.find(r => r.label === params.flowers)
      : undefined

    return await getProducts({
      categorySlug: isBudget || isHits ? undefined : params.category,
      sectionId: params.section ? Number(params.section) : undefined,
      isHit: isHits ? true : undefined,
      priceMax: params.priceMax ? Number(params.priceMax) : isBudget ? 2000 : undefined,
      priceMin: params.priceMin ? Number(params.priceMin) : undefined,
      sort: params.sort,
      inStock: true,
      limit: 700,
      occasionId,
      color: params.color,
      packaging: params.packaging,
      flowerCountMin: flowerRange?.min,
      flowerCountMax: flowerRange?.max,
      search: params.search,
    })
  } catch {
    return []
  }
}

export default async function CatalogPage({ searchParams }: Props) {
  const params = await searchParams
  const [occasions, sections] = await Promise.all([
    getOccasions().catch(() => []),
    getHomeSections().catch(() => []),
  ])

  const activeOccasion = params.occasion
    ? occasions.find(o => o.slug === params.occasion)
    : undefined

  const activeSection = params.section
    ? sections.find(s => s.id === Number(params.section))
    : undefined

  const rawProducts = await fetchProducts(params, activeOccasion?.id)
  // Исключаем дополнения к заказу из основного каталога
  const products = (rawProducts as unknown as Product[]).filter(p => !p.isAddon)

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        {activeSection ? activeSection.title : activeOccasion ? activeOccasion.name : 'Каталог букетов'}
      </h1>

      <form action="/catalog" method="get" className="mb-8 flex gap-2 max-w-2xl">
        <input
          type="search"
          name="search"
          defaultValue={params.search ?? ''}
          placeholder="Поиск по названию или артикулу..."
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
        <button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl px-5 py-3 text-sm font-medium transition-colors">
          Найти
        </button>
        {params.search && <a href="/catalog" className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 hover:bg-gray-50">Сбросить</a>}
      </form>

      <div className="flex flex-col md:flex-row gap-8">
        <Suspense fallback={null}>
          <CatalogFilters occasions={occasions} flowerCountRanges={FLOWER_COUNT_RANGES} />
        </Suspense>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">{products.length} букетов</p>
            <div className="flex gap-2">
              {[
                { label: 'Популярные', value: '' },
                { label: 'Дешевле', value: 'price_asc' },
                { label: 'Дороже', value: 'price_desc' },
              ].map((s) => (
                <a
                  key={s.value}
                  href={`?sort=${s.value}`}
                  className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                    params.sort === s.value || (!params.sort && s.value === '')
                      ? 'bg-rose-500 text-white border-rose-500'
                      : 'border-gray-300 text-gray-600 hover:border-rose-300'
                  }`}
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="text-center py-24 text-gray-400">
              <p className="text-5xl mb-4">🌸</p>
              <p className="text-lg font-medium">По вашему запросу ничего не найдено</p>
              <a href="/catalog" className="mt-4 inline-block text-rose-500 hover:underline">
                Сбросить фильтры
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
