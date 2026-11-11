'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Camera, Shield, RefreshCw, Star, Heart, Share2, Tag, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Product, Review } from '@/types'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/store/cart'
import ProductCard from '@/components/catalog/ProductCard'
import { cn } from '@/lib/utils'

const TRUST_BADGES = [
  { icon: Camera, label: 'Фото перед отправкой' },
  { icon: Shield, label: 'Гарантия свежести 48 ч' },
  { icon: RefreshCw, label: 'Бесплатная замена' },
]

const YANDEX_MAPS_URL = 'https://yandex.ru/maps/org/meri/214245713508/reviews/'

interface Props {
  product: Product & { reviews: Review[] }
  similar: Product[]
  boughtTogether?: Product[]
  addons?: Product[]
  groupVariants?: Product[]
  colorSiblings?: Product[]
}

export default function ProductPageClient({ product, similar, boughtTogether = [], addons = [], groupVariants = [], colorSiblings = [] }: Props) {
  const router = useRouter()
  const [activeImage, setActiveImage] = useState(0)
  const [size, setSize] = useState<'S' | 'M' | 'L'>('M')
  const [isFav, setIsFav] = useState(false)
  const [addonTab, setAddonTab] = useState('Все')
  const { addItem } = useCartStore()

  // Цвет: ключ = первый цвет из массива или 'другой'
  const colorKey = (v: Product) => (v.colors && v.colors.length > 0 ? v.colors[0] : null)

  // Variant selector state
  const hasGroup = groupVariants.length > 1
  const [selFlowerCount, setSelFlowerCount] = useState<number | null>(product.flowerCount ?? null)
  const [selPackaging, setSelPackaging] = useState<string | null>(product.packaging ?? null)
  const [selColor, setSelColor] = useState<string | null>(colorKey(product))
  const [descExpanded, setDescExpanded] = useState(false)

  // Количество стеблей — из colorSiblings (все товары того же цвета), уникальные значения
  const flowerPool = colorSiblings.length > 0 ? colorSiblings : (hasGroup ? groupVariants : [product])
  const uniqFlower = [...new Set(flowerPool.map(v => v.flowerCount).filter((v): v is number => v != null))].sort((a, b) => a - b)

  // Цвет и упаковка — из groupVariants (одна группа)
  const groupPool = hasGroup ? groupVariants : [product]
  const uniqPack = [...new Set(groupPool.map(v => v.packaging).filter((v): v is string => v != null && v !== ''))]
  const uniqColors = [...new Set(groupPool.map(colorKey).filter((v): v is string => v != null && v !== ''))]

  // Hex-цвета для отображения точек
  const COLOR_HEX: Record<string, string> = {
    'красный': '#ef4444', 'малиновый': '#be185d', 'розовый': '#f472b6',
    'белый': '#f3f4f6', 'желтый': '#facc15', 'оранжевый': '#fb923c',
    'фиолетовый': '#a855f7', 'кремовый': '#fef3c7', 'коралловый': '#f87171',
    'бордовый': '#991b1b', 'персиковый': '#fcd34d', 'синий': '#3b82f6',
    'зеленый': '#4ade80', 'смешанный': 'conic-gradient(#f472b6,#facc15,#a855f7,#f472b6)',
  }

  function navigateVariant(overrides: {
    flowerCount?: number | null
    packaging?: string | null
    color?: string | null
  }) {
    const fc = overrides.flowerCount !== undefined ? overrides.flowerCount : selFlowerCount
    const pk = overrides.packaging !== undefined ? overrides.packaging : selPackaging
    const cl = overrides.color !== undefined ? overrides.color : selColor

    // Смена количества — ищем в colorSiblings: тот же цвет, то же кол-во, желательно та же упаковка
    if (overrides.flowerCount !== undefined) {
      const pool = colorSiblings.length > 0 ? colorSiblings : groupVariants
      let match = pool.find(v => v.flowerCount === fc && colorKey(v) === cl && v.packaging === pk)
      if (!match) match = pool.find(v => v.flowerCount === fc && colorKey(v) === cl)
      if (!match) match = pool.find(v => v.flowerCount === fc)
      if (match && match.id !== product.id) router.push(`/catalog/${match.slug}`)
      return
    }

    // Смена цвета/упаковки — ищем в groupVariants
    let match = groupVariants.find(v => colorKey(v) === cl && v.packaging === pk)
    if (!match) match = groupVariants.find(v => colorKey(v) === cl)
    if (!match && overrides.packaging !== undefined) match = groupVariants.find(v => v.packaging === pk)
    if (!match && overrides.color !== undefined) match = groupVariants.find(v => colorKey(v) === cl)
    if (match && match.id !== product.id) router.push(`/catalog/${match.slug}`)
  }

  useEffect(() => {
    setActiveImage(0)
    const favs: number[] = JSON.parse(localStorage.getItem('favorites') || '[]')
    setIsFav(favs.includes(product.id))
  }, [product.id])

  function toggleFav() {
    const favs: number[] = JSON.parse(localStorage.getItem('favorites') || '[]')
    const next = isFav ? favs.filter(id => id !== product.id) : [...favs, product.id]
    localStorage.setItem('favorites', JSON.stringify(next))
    setIsFav(!isFav)
  }

  async function share() {
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title: product.name, url }) } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
      alert('Ссылка скопирована')
    }
  }

  const price =
    size === 'L' && product.priceL
      ? product.priceL
      : size === 'S' && product.price
      ? Math.round(product.price * 0.8)
      : product.price

  const sizeOptions = [
    { label: 'S', available: true, hint: 'маленький' },
    { label: 'M', available: true, hint: 'средний' },
    { label: 'L', available: !!product.priceL, hint: 'большой' },
  ]

  const addonCategories = ['Все', ...Array.from(new Set(addons.map(a => a.addonCategory || 'Другое')))]
  const visibleAddons = addonTab === 'Все' ? addons : addons.filter(a => (a.addonCategory || 'Другое') === addonTab)

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="grid md:grid-cols-2 gap-12">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50"
            role="region" aria-label="Фотографии товара" tabIndex={0}
            onKeyDown={event => {
              if (product.images.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
              event.preventDefault()
              setActiveImage(index => (index + (event.key === 'ArrowLeft' ? -1 : 1) + product.images.length) % product.images.length)
            }}>
            {product.images[activeImage] ? (
              <Image
                src={product.images[activeImage]}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-300 text-8xl">🌸</div>
            )}
            {product.images.length > 1 && (
              <>
                <button type="button" aria-label="Предыдущее фото"
                  onClick={() => setActiveImage(index => (index - 1 + product.images.length) % product.images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white focus-visible:outline-2 focus-visible:outline-rose-500">
                  <ChevronLeft size={24} />
                </button>
                <button type="button" aria-label="Следующее фото"
                  onClick={() => setActiveImage(index => (index + 1) % product.images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white focus-visible:outline-2 focus-visible:outline-rose-500">
                  <ChevronRight size={24} />
                </button>
              </>
            )}
            {/* Dimension badge */}
            {(product.width || product.height) && (
              <div className="absolute bottom-3 right-3 bg-black/60 text-white text-sm font-semibold px-3 py-1.5 rounded-xl backdrop-blur-sm">
                {product.width && product.height
                  ? `${product.width} × ${product.height} см`
                  : product.width ? `Ш ${product.width} см` : `В ${product.height} см`}
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Показать фото ${i + 1}`}
                  aria-pressed={activeImage === i}
                  onClick={() => setActiveImage(i)}
                  className={cn('relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-colors', {
                    'border-rose-500': activeImage === i,
                    'border-transparent': activeImage !== i,
                  })}
                >
                  <Image src={img} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          {/* Title + icons */}
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                <button onClick={toggleFav} title="В избранное"
                  className={cn('w-9 h-9 rounded-full border flex items-center justify-center transition-colors',
                    isFav ? 'border-rose-500 text-rose-500' : 'border-gray-200 text-gray-400 hover:border-rose-400 hover:text-rose-500'
                  )}>
                  <Heart className={cn('w-4 h-4', isFav && 'fill-rose-500')} />
                </button>
                <button onClick={share} title="Поделиться"
                  className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {product.sku && (
              <div className="flex items-center gap-1.5 text-sm text-gray-400">
                <Tag className="w-3.5 h-3.5" />
                <span>Артикул: {product.sku}</span>
              </div>
            )}
          </div>

          {/* Variant selectors (group) or S/M/L fallback */}
          {(hasGroup || uniqFlower.length > 0 || uniqColors.length > 0 || uniqPack.length > 0 || selFlowerCount) ? (
            <div className="space-y-5">
              {/* Цвет розы */}
              {uniqColors.length > 0 && (
                <div>
                  <p className="font-semibold mb-3">
                    Цвет розы
                    {selColor && (
                      <span className="ml-2 text-sm font-normal text-gray-500 capitalize">{selColor}</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {uniqColors.map(cl => (
                      <button
                        key={cl}
                        title={cl}
                        onClick={() => { setSelColor(cl); navigateVariant({ color: cl }) }}
                        className={cn(
                          'w-8 h-8 rounded-full border-2 transition-all',
                          selColor === cl ? 'border-rose-500 scale-110' : 'border-transparent hover:border-gray-300'
                        )}
                        style={{ background: COLOR_HEX[cl] ?? '#d1d5db' }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* Количество стеблей */}
              {uniqFlower.length > 0 && (
                <div>
                  <p className="font-semibold mb-3">Количество стеблей, шт</p>
                  <div className="flex flex-wrap gap-2">
                    {uniqFlower.map(fc => (
                      <button
                        key={fc}
                        onClick={() => { setSelFlowerCount(fc); navigateVariant({ flowerCount: fc }) }}
                        className={cn(
                          'w-12 h-12 rounded-full border-2 font-semibold text-sm transition-colors',
                          selFlowerCount === fc
                            ? 'border-rose-500 text-rose-600 bg-rose-50'
                            : 'border-gray-200 text-gray-700 hover:border-rose-300'
                        )}
                      >
                        {fc}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Упаковка */}
              {uniqPack.length > 0 && (
                <div>
                  <p className="font-semibold mb-3">Упаковка</p>
                  <div className="flex flex-wrap gap-2">
                    {uniqPack.map(pk => (
                      <button
                        key={pk}
                        onClick={() => { setSelPackaging(pk); navigateVariant({ packaging: pk }) }}
                        className={cn(
                          'px-4 py-2 rounded-full border-2 font-medium text-sm transition-colors',
                          selPackaging === pk
                            ? 'border-rose-500 text-rose-600 bg-rose-50'
                            : 'border-gray-200 text-gray-700 hover:border-rose-300'
                        )}
                      >
                        {pk}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="font-semibold mb-3">Размер букета</p>
              <div className="flex gap-3">
                {sizeOptions.map((opt) => (
                  <button
                    key={opt.label}
                    disabled={!opt.available}
                    onClick={() => setSize(opt.label as 'S' | 'M' | 'L')}
                    className={cn(
                      'px-5 py-2 rounded-full border font-medium text-sm transition-colors',
                      opt.available ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed',
                      size === opt.label
                        ? 'bg-rose-500 border-rose-500 text-white'
                        : 'border-gray-300 text-gray-700 hover:border-rose-400'
                    )}
                  >
                    {opt.label} <span className="text-xs opacity-70">({opt.hint})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price + CTA */}
          <div className="flex items-center gap-4">
            <span className="text-4xl font-extrabold text-gray-900">{formatPrice(price)}</span>
            <button
              onClick={() => addItem(product, size)}
              disabled={!product.inStock}
              className="flex items-center gap-2 bg-rose-500 text-white px-8 py-3 rounded-full font-semibold text-lg hover:bg-rose-600 transition-colors disabled:opacity-50"
            >
              <ShoppingCart className="w-5 h-5" />
              В корзину
            </button>
          </div>

          {/* Trust */}
          <div className="flex flex-col gap-2 pt-2">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-gray-600">
                <Icon className="w-4 h-4 text-rose-500" />
                {label}
              </div>
            ))}
          </div>

          {/* Description */}
          {product.description && (
            <div className="border-t border-gray-100 pt-3">
              <button
                onClick={() => setDescExpanded(v => !v)}
                className="flex items-center justify-between w-full text-left"
              >
                <p className="font-semibold">О букете</p>
                <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${descExpanded ? 'rotate-180' : ''}`} />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${descExpanded ? 'max-h-[2000px] mt-2' : 'max-h-[4.5rem] mt-2'}`}>
                <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
              </div>
              {!descExpanded && (
                <button onClick={() => setDescExpanded(true)} className="text-rose-500 text-xs mt-1 hover:underline">
                  Читать полностью
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Добавьте к заказу */}
      {addons.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Добавьте к заказу</h2>
          {addonCategories.length > 2 && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {addonCategories.map(cat => (
                <button key={cat} onClick={() => setAddonTab(cat)}
                  className={cn('px-4 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-colors',
                    addonTab === cat
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  )}>
                  {cat}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {visibleAddons.map(a => (
              <div key={a.id} className="flex-shrink-0 w-44 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="relative w-full h-44 bg-gray-50">
                  {a.images[0] ? (
                    <Image src={a.images[0]} alt={a.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">🎁</div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs text-gray-700 font-medium line-clamp-2 mb-1">{a.name}</p>
                  <p className="text-sm font-bold text-gray-900 mb-2">{formatPrice(a.price)}</p>
                  <button
                    onClick={() => addItem(a, 'M')}
                    disabled={!a.inStock}
                    className="w-full text-xs bg-gray-900 text-white py-1.5 rounded-full font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {a.inStock ? 'Купить' : 'Нет в наличии'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      {product.reviews && product.reviews.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Отзывы</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {product.reviews.map((r) => (
              <div key={r.id} className="bg-gray-50 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-sm">{r.author}</span>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn('w-3.5 h-3.5', i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300')}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 text-sm">{r.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Review CTA */}
      <section className="mt-16 text-center py-12 border-t border-gray-100">
        <p className="text-sm font-semibold tracking-widest text-gray-400 uppercase mb-6">
          Возможно ваш отзыв поможет сделать кому-то выбор
        </p>
        <a
          href={YANDEX_MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block border border-gray-900 text-gray-900 px-10 py-3 text-sm font-semibold tracking-widest uppercase hover:bg-gray-900 hover:text-white transition-colors"
        >
          Оставить отзыв
        </a>
      </section>

      {/* С этим покупают */}
      {boughtTogether.length > 0 && (
        <section className="mt-16">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">С этим покупают</h2>
            <span className="bg-rose-100 text-rose-600 text-xs font-semibold px-3 py-1 rounded-full">Популярное</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {boughtTogether.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Похожие */}
      {similar.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Похожие букеты</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
