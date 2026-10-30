'use client'

import { Camera, Gift, Percent, Clock, Shield, Truck, Heart, Star, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'

const ICONS: Record<string, React.ElementType> = {
  camera: Camera, gift: Gift, percent: Percent, clock: Clock,
  shield: Shield, truck: Truck, heart: Heart, star: Star, book: BookOpen,
}

interface Item { icon: string; title: string; text: string }
interface Props { title: string; items: Item[] }

export default function AdvantagesSection({ title, items }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scroll(dir: 'left' | 'right') {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' })
  }

  return (
    <section className="py-3 px-4 bg-gray-50/50">
      <div className="max-w-7xl mx-auto relative">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center text-gray-500 hover:text-rose-500 transition -ml-1"
        >
          <ChevronLeft size={18} />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scroll-smooth px-8"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item, i) => {
            const Icon = ICONS[item.icon] ?? Heart
            return (
              <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm shrink-0 w-[calc(50%-4px)] md:w-auto">
                <div className="w-9 h-9 bg-rose-50 rounded-full flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{item.title}</p>
                  <p className="text-xs text-gray-400 leading-snug mt-0.5">{item.text}</p>
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center text-gray-500 hover:text-rose-500 transition -mr-1"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  )
}
