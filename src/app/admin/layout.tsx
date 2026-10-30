'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ShoppingBag, Package, LogOut, Star, LayoutDashboard, Layers, Heart, Users, FileText, Settings, MapPin, Gift, PanelTop } from 'lucide-react'

const nav = [
  { href: '/admin/products', label: 'Товары', icon: Package },
  { href: '/admin/orders', label: 'Заказы', icon: ShoppingBag },
  { href: '/admin/customers', label: 'Покупатели', icon: Users },
  { href: '/admin/bonuses', label: 'Бонусы', icon: Gift },
  { href: '/admin/sections', label: 'Главная страница', icon: LayoutDashboard },
  { href: '/admin/pages', label: 'Страницы', icon: PanelTop },
  { href: '/admin/categories', label: 'Категории', icon: Layers },
  { href: '/admin/occasions', label: 'Поводы', icon: Heart },
  { href: '/admin/reviews', label: 'Отзывы', icon: Star },
  { href: '/admin/legal', label: 'Правовые страницы', icon: FileText },
  { href: '/admin/districts', label: 'Районы доставки', icon: MapPin },
  { href: '/admin/settings', label: 'Настройки сайта', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname === '/admin/login') return <>{children}</>

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100">
          <span className="text-lg font-bold text-pink-500">Meri Florist</span>
          <p className="text-xs text-gray-400 mt-0.5">Администратор</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  active
                    ? 'bg-pink-50 text-pink-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 transition w-full"
          >
            <LogOut size={18} />
            Выйти
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
