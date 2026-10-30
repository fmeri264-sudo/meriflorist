'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'

const STEPS = [
  { num: '1', title: 'Выбрали букет', desc: 'В каталоге или напишите нам — подберём сами' },
  { num: '2', title: 'Подтвердили заказ', desc: 'Перезвоним или напишем в WhatsApp в течение 10 минут' },
  { num: '3', title: 'Собрали и сфотографировали', desc: 'Пришлём фото букета до отправки' },
  { num: '4', title: 'Доставили', desc: 'Бережно и вовремя, в интервал который вы выбрали' },
]

export default function HowWeWork() {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scroll(dir: 'left' | 'right') {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' })
  }

  return (
    <section className="py-3 px-4">
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
          {STEPS.map((step) => (
            <div key={step.num} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm shrink-0 w-[calc(50%-4px)] md:w-auto">
              <div className="w-8 h-8 rounded-full bg-rose-500 text-white text-sm font-extrabold flex items-center justify-center shrink-0">
                {step.num}
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm text-gray-900 leading-tight">{step.title}</p>
                <p className="text-xs text-gray-400 leading-snug mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
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
