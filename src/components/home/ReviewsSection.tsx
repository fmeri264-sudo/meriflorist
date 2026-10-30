'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Star, ChevronDown, ChevronUp } from 'lucide-react'
import { DbReview } from '@/lib/supabase'

const SOURCE_LABELS: Record<string, string> = {
  ym: 'Яндекс Маркет', ozon: 'Ozon', wb: 'Wildberries',
  google: 'Google', direct: 'Сайт',
}

const PREVIEW_COUNT = 4

function ReviewCard({ r }: { r: DbReview }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3 min-w-0">
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map(n => (
          <Star key={n} size={14} className={n <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
        ))}
      </div>
      <p className="text-gray-700 text-sm leading-relaxed flex-1 line-clamp-4">«{r.text}»</p>
      {r.productName && (
        r.productUrl ? (
          <Link href={r.productUrl} title={r.productName} className="text-xs text-rose-500 font-medium truncate underline underline-offset-2 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-rose-500">
            {r.productName}
          </Link>
        ) : <p className="text-xs text-rose-400 font-medium truncate">{r.productName}</p>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <span className="font-semibold text-sm text-gray-900 truncate">{r.author}</span>
        <span className="text-xs text-gray-400 shrink-0 ml-2">{SOURCE_LABELS[r.source] ?? r.source}</span>
      </div>
    </div>
  )
}

interface Props { title: string; reviews: DbReview[] }

export default function ReviewsSection({ title, reviews }: Props) {
  const [expanded, setExpanded] = useState(false)
  if (!reviews.length) return null

  const preview = reviews.slice(0, PREVIEW_COUNT)
  const hasMore = reviews.length > PREVIEW_COUNT

  return (
    <section className="py-14 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
          {hasMore && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-rose-500 font-medium text-sm hover:text-rose-600 transition"
            >
              {expanded ? (
                <><ChevronUp size={16} /> Свернуть</>
              ) : (
                <>Смотреть все <ChevronDown size={16} /></>
              )}
            </button>
          )}
        </div>

        {/* Preview row */}
        {!expanded && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {preview.map(r => <ReviewCard key={r.id} r={r} />)}
          </div>
        )}

        {/* Expanded grid */}
        {expanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reviews.map(r => <ReviewCard key={r.id} r={r} />)}
          </div>
        )}

        {hasMore && !expanded && (
          <div className="text-center mt-6">
            <button
              onClick={() => setExpanded(true)}
              className="inline-flex items-center gap-2 border border-rose-200 text-rose-500 px-6 py-2.5 rounded-full text-sm font-medium hover:bg-rose-50 transition"
            >
              Смотреть все отзывы ({reviews.length}) <ChevronDown size={15} />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
