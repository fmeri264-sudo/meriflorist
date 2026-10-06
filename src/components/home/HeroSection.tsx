import Link from 'next/link'
import { getOccasions } from '@/lib/supabase'
import OccasionsList from './OccasionsList'
import USPList from './USPList'
import { Search } from 'lucide-react'

export default async function HeroSection() {
  const occasions = await getOccasions().catch(() => [])

  return (
    <section className="bg-gradient-to-br from-rose-50 to-pink-50 py-1.5 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-2 md:gap-6 mb-1">
          <p className="min-w-0 truncate text-xs md:text-base font-normal text-gray-900">
            Доставка цветов по Санкт-Петербургу
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Link
              href="/catalog"
              className="flex items-center gap-1 border border-rose-300 bg-white/80 text-rose-600 px-2.5 py-1 rounded-full text-xs font-bold hover:bg-white transition-colors"
            >
              <Search size={13} />
              Поиск
            </Link>
            <Link
              href="/catalog"
              className="bg-rose-500 text-white px-2.5 py-1 rounded-full text-xs font-bold hover:bg-rose-600 transition-colors shadow-md"
            >
              Выбрать букет
            </Link>
          </div>
        </div>

        <USPList />

        {occasions.length > 0 && <OccasionsList occasions={occasions} />}
      </div>
    </section>
  )
}
