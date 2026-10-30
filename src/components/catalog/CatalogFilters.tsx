'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'

interface Occasion { id: number; name: string; slug: string }
interface FlowerRange { label: string; min: number; max?: number }

interface Props {
  occasions?: Occasion[]
  flowerCountRanges?: FlowerRange[]
}

const COLORS = [
  { value: 'красный', label: 'Красный', hex: '#ef4444' },
  { value: 'малиновый', label: 'Малиновый', hex: '#be185d' },
  { value: 'розовый', label: 'Розовый', hex: '#f472b6' },
  { value: 'бело-розовый', label: 'Бело-розовый', hex: 'linear-gradient(135deg,#fff 50%,#f472b6 50%)' },
  { value: 'белый', label: 'Белый', hex: '#e5e7eb' },
  { value: 'желтый', label: 'Желтый', hex: '#facc15' },
  { value: 'оранжевый', label: 'Оранжевый', hex: '#fb923c' },
  { value: 'фиолетовый', label: 'Фиолетовый', hex: '#a855f7' },
  { value: 'кремовый', label: 'Кремовый', hex: '#fef3c7' },
  { value: 'зелено-розовый', label: 'Зелено-розовый', hex: 'linear-gradient(135deg,#4ade80 50%,#f472b6 50%)' },
  { value: 'смешанный', label: 'Смешанный', hex: 'conic-gradient(#f472b6,#facc15,#a855f7,#f472b6)' },
]

const PACKAGING = ['Букет', 'Коробка', 'Корзина', 'Шляпная коробка', 'Пакет']

export default function CatalogFilters({ occasions = [], flowerCountRanges = [] }: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const [open, setOpen] = useState(false)
  const [priceMin, setPriceMin] = useState(sp.get('priceMin') ?? '')
  const [priceMax, setPriceMax] = useState(sp.get('priceMax') ?? '')

  const activeOccasion = sp.get('occasion') ?? ''
  const activeColor = sp.get('color') ?? ''
  const activePackaging = sp.get('packaging') ?? ''
  const activeFlowers = sp.get('flowers') ?? ''

  const apply = (overrides: Record<string, string>) => {
    const params = new URLSearchParams(sp.toString())
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, v)
      else params.delete(k)
    })
    router.push(`/catalog?${params.toString()}`)
  }

  const toggle = (key: string, current: string, value: string) =>
    apply({ [key]: current === value ? '' : value })

  return (
    <>
      <button
        className="md:hidden flex items-center gap-2 text-sm font-medium border px-4 py-2 rounded-full mb-4"
        onClick={() => setOpen(!open)}
      >
        <SlidersHorizontal className="w-4 h-4" />
        Фильтры
      </button>

      <aside className={`${open ? 'block' : 'hidden'} md:block w-full md:w-56 flex-shrink-0 space-y-6`}>

        {/* Price */}
        <div>
          <p className="font-semibold text-gray-800 mb-3">Цена, ₽</p>
          <div className="flex gap-2 items-center">
            <input type="number" placeholder="от" value={priceMin}
              onChange={e => setPriceMin(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
            <span className="text-gray-400">–</span>
            <input type="number" placeholder="до" value={priceMax}
              onChange={e => setPriceMax(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button onClick={() => apply({ priceMin, priceMax })}
            className="mt-2 w-full bg-gray-100 hover:bg-gray-200 text-sm py-2 rounded-lg">
            Применить
          </button>
        </div>

        {/* Color */}
        <div>
          <p className="font-semibold text-gray-800 mb-3">Цвет розы</p>
          <div className="flex flex-wrap gap-2">
            {COLORS.map(c => (
              <button key={c.value}
                onClick={() => toggle('color', activeColor, c.value)}
                title={c.label}
                className={`w-7 h-7 rounded-full border-2 transition-all ${activeColor === c.value ? 'border-pink-500 scale-110' : 'border-transparent hover:border-gray-300'}`}
                style={{ background: c.hex }}
              />
            ))}
          </div>
          {activeColor && (
            <p className="text-xs text-rose-500 mt-1 cursor-pointer" onClick={() => apply({ color: '' })}>
              {COLORS.find(c => c.value === activeColor)?.label} ✕
            </p>
          )}
        </div>

        {/* Flower count */}
        {flowerCountRanges.length > 0 && (
          <div>
            <p className="font-semibold text-gray-800 mb-3">Количество цветов</p>
            <div className="flex flex-wrap gap-2">
              {flowerCountRanges.map(r => (
                <button key={r.label}
                  onClick={() => toggle('flowers', activeFlowers, r.label)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    activeFlowers === r.label
                      ? 'bg-rose-500 text-white border-rose-500'
                      : 'border-gray-300 text-gray-600 hover:border-rose-400'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Packaging */}
        <div>
          <p className="font-semibold text-gray-800 mb-3">Упаковка</p>
          <div className="flex flex-wrap gap-2">
            {PACKAGING.map(p => (
              <button key={p}
                onClick={() => toggle('packaging', activePackaging, p)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  activePackaging === p
                    ? 'bg-rose-500 text-white border-rose-500'
                    : 'border-gray-300 text-gray-600 hover:border-rose-400'
                }`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Occasions */}
        {occasions.length > 0 && (
          <div>
            <p className="font-semibold text-gray-800 mb-3">Повод</p>
            <div className="flex flex-wrap gap-2">
              {occasions.map(o => (
                <button key={o.id}
                  onClick={() => toggle('occasion', activeOccasion, o.slug)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    activeOccasion === o.slug
                      ? 'bg-rose-500 text-white border-rose-500'
                      : 'border-gray-300 text-gray-600 hover:border-rose-400'
                  }`}>
                  {o.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Delivery */}
        <div>
          <p className="font-semibold text-gray-800 mb-3">Доставка</p>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox"
              checked={sp.get('deliveryToday') === '1'}
              onChange={e => apply({ deliveryToday: e.target.checked ? '1' : '' })}
              className="accent-rose-500" />
            Доставка сегодня
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer mt-2">
            <input type="checkbox"
              checked={sp.get('selfPickup') === '1'}
              onChange={e => apply({ selfPickup: e.target.checked ? '1' : '' })}
              className="accent-rose-500" />
            Самовывоз
          </label>
        </div>

        <a href="/catalog" className="block text-sm text-rose-500 hover:underline">
          Сбросить фильтры
        </a>
      </aside>
    </>
  )
}
