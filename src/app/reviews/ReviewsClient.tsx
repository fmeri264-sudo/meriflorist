'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Star } from 'lucide-react'

interface Review {
  id: number
  author: string
  text: string
  rating: number
  source: string
  productName: string | null
  productUrl?: string
  createdAt: string
}

const SOURCES = [
  { value: 'all', label: 'Все отзывы' },
  { value: 'ym', label: 'Яндекс Маркет' },
  { value: 'ozon', label: 'Ozon' },
  { value: 'wb', label: 'Wildberries' },
  { value: 'direct', label: 'Напрямую' },
]

const SOURCE_STYLES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  ym: { label: 'Яндекс Маркет', bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-400' },
  ozon: { label: 'Ozon', bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
  wb: { label: 'Wildberries', bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500' },
  google: { label: 'Google', bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-500' },
  direct: { label: 'Покупатель', bg: 'bg-pink-50', text: 'text-pink-600', dot: 'bg-pink-400' },
}

function ReviewCard({ r }: { r: Review }) {
  const style = SOURCE_STYLES[r.source] ?? SOURCE_STYLES.direct
  const date = new Date(r.createdAt).toLocaleDateString('ru', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-0.5 mt-0.5">
          {[1, 2, 3, 4, 5].map(n => (
            <Star key={n} size={15}
              className={n <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
          ))}
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text} shrink-0`}>
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </div>

      <p className="text-gray-700 text-sm leading-relaxed flex-1">«{r.text}»</p>

      {r.productName && (
        r.productUrl ? (
          <Link href={r.productUrl} title={r.productName} className="text-xs text-rose-500 font-medium truncate underline underline-offset-2 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-rose-500">
            Букет: {r.productName}
          </Link>
        ) : <p className="text-xs text-rose-400 font-medium truncate">Букет: {r.productName}</p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {r.author[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="font-semibold text-sm text-gray-900 truncate">{r.author}</span>
        </div>
        <span className="text-xs text-gray-400 shrink-0 ml-2">{date}</span>
      </div>
    </div>
  )
}

interface Props {
  reviews: Review[]
}

export default function ReviewsClient({ reviews }: Props) {
  const [activeSource, setActiveSource] = useState('all')

  const filtered = activeSource === 'all'
    ? reviews
    : reviews.filter(r => r.source === activeSource)

  const availableSources = SOURCES.filter(s =>
    s.value === 'all' || reviews.some(r => r.source === s.value)
  )

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0'

  return (
    <>
      {/* Stats */}
      <div className="flex flex-wrap items-center gap-6 mb-8">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n} size={22} className="fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <span className="text-2xl font-bold text-gray-900">{avgRating}</span>
        </div>
        <span className="text-gray-400 text-sm">{reviews.length} отзывов</span>
        <div className="flex items-center gap-3 ml-auto">
          {(['ym', 'ozon', 'wb'] as const).map(src => {
            const count = reviews.filter(r => r.source === src).length
            if (!count) return null
            const s = SOURCE_STYLES[src]
            return (
              <span key={src} className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.bg} ${s.text}`}>
                {s.label}: {count}
              </span>
            )
          })}
        </div>
      </div>

      {/* Source filter */}
      {availableSources.length > 2 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {availableSources.map(s => (
            <button
              key={s.value}
              onClick={() => setActiveSource(s.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeSource === s.value
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-rose-300 hover:text-rose-500'
              }`}
            >
              {s.label}
              {s.value !== 'all' && (
                <span className="ml-1.5 opacity-70 text-xs">
                  ({reviews.filter(r => r.source === s.value).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Нет отзывов по выбранной площадке</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => <ReviewCard key={r.id} r={r} />)}
        </div>
      )}

      {/* CTA */}
      <div className="mt-14 bg-gradient-to-br from-pink-50 to-rose-50 rounded-3xl p-8 text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Расскажите о своём заказе</h3>
        <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
          Ваш отзыв помогает другим покупателям и вдохновляет нас делать всё лучше
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="https://yandex.ru/maps/org/meri/214245713508/reviews/"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-full text-sm font-medium hover:border-orange-400 hover:text-orange-500 transition shadow-sm"
          >
            <span className="text-base">🗺️</span> Яндекс Карты
          </a>
          <a
            href="https://go.2gis.com/Vb1n6"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-full text-sm font-medium hover:border-green-400 hover:text-green-600 transition shadow-sm"
          >
            <span className="text-base">📍</span> 2ГИС
          </a>
        </div>
      </div>
    </>
  )
}
