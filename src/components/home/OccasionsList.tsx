'use client'

import Link from 'next/link'
import { useRef, useEffect, useState } from 'react'

interface Occasion { id: number; name: string; slug: string }

export default function OccasionsList({ occasions }: { occasions: Occasion[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (el) setOverflows(el.scrollHeight > 60)
  }, [])

  return (
    <div className="relative">
      <div
        ref={ref}
        className={`flex flex-wrap justify-center gap-1 transition-all duration-300 overflow-hidden ${!expanded ? 'max-h-[56px]' : ''}`}
      >
        {occasions.map((o) => (
          <Link
            key={o.id}
            href={`/catalog?occasion=${o.slug}`}
            className="bg-white border border-rose-200 text-rose-600 px-2.5 py-0 rounded-full text-xs font-medium hover:bg-rose-500 hover:text-white transition-colors whitespace-nowrap leading-6"
          >
            {o.name}
          </Link>
        ))}
      </div>

      {overflows && (
        <div className="flex justify-center mt-2">
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-rose-500 text-xs font-medium hover:underline"
          >
            {expanded ? 'Свернуть ↑' : `Ещё поводы ↓`}
          </button>
        </div>
      )}
    </div>
  )
}
