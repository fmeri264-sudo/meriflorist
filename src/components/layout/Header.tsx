'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, User, Phone, Menu, X } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useState } from 'react'
import type { SiteSettings } from '@/lib/settings'
import type { PageNav } from '@/lib/pages'
import { getPageUrl } from '@/lib/pages'

const NAV_LINKS = [
  { href: '/catalog', label: 'Каталог' },
  { href: '/delivery', label: 'Доставка и оплата' },
  { href: '/reviews', label: 'Отзывы' },
  { href: '/contacts', label: 'Контакты' },
]

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
    </svg>
  )
}

function VKIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.204.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.762-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z" />
    </svg>
  )
}

function MaxIcon() {
  return (
    <svg viewBox="0 0 42 44" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M21.4234 0C33.0451 0 42.1572 9.42783 42.1572 21.0579C42.1572 32.688 32.7552 41.8841 21.5335 41.8841C17.5524 41.8841 15.6204 41.3232 12.5139 39.1235C12.3004 38.9723 12.0062 39.0134 11.8272 39.2043C9.43522 41.7558 3.31317 43.5454 3.03275 40.0629C3.03275 33.9928 2.89573e-05 30.0472 0 20.942C0 8.9892 9.80174 0.000105742 21.4234 0ZM21.7498 10.3647C16.2345 10.0754 11.9306 13.9028 10.9815 19.8934C10.1955 24.8543 11.5891 30.899 12.781 31.2033C13.2866 31.3321 14.503 30.4018 15.388 29.5672C15.5544 29.4103 15.8062 29.384 16.0013 29.5033C17.381 30.347 18.9433 30.981 20.6654 31.0713C26.3275 31.3682 31.345 26.9362 31.6415 21.2731C31.938 15.61 27.4119 10.6617 21.7498 10.3647Z" fill="#7C3AED" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

interface HeaderProps {
  settings?: Partial<SiteSettings>
  navPages?: PageNav[]
}

export default function Header({ settings, navPages = [] }: HeaderProps) {
  const { count, openCart } = useCartStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const siteName = settings?.siteName || 'Meri Florist'
  const logoUrl = settings?.logoUrl || ''
  const phone = settings?.phone || '+7 (800) 123-45-67'
  const phoneClean = phone.replace(/\D/g, '')
  const whatsapp = settings?.whatsapp || ''
  const telegram = settings?.telegram || ''
  const vk = settings?.vk || ''
  const max = settings?.max || ''

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="min-w-0 shrink">
          {logoUrl ? (
            <Image src={logoUrl} alt={siteName} width={120} height={40} className="h-10 w-auto object-contain" />
          ) : (
            <span className="text-base sm:text-xl text-rose-500 tracking-tight line-clamp-1">
              <span className="font-bold">МЭРИ.</span>
              <span className="font-normal"> Ваш личный флорист</span>
            </span>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-700">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-rose-500 transition-colors">
              {l.label}
            </Link>
          ))}
          {navPages.map((p) => (
            <Link key={p.id} href={getPageUrl(p)} className="hover:text-rose-500 transition-colors">
              {p.headerLabel || p.title}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <a
            href={`tel:+${phoneClean}`}
            className="hidden lg:flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-rose-500"
          >
            <Phone className="w-4 h-4" />
            {phone}
          </a>

          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-full text-green-600 hover:bg-green-50 transition-colors"
              title="WhatsApp"
            >
              <WhatsAppIcon />
            </a>
          )}

          {telegram && (
            <a
              href={telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-full text-sky-500 hover:bg-sky-50 transition-colors"
              title="Telegram"
            >
              <TelegramIcon />
            </a>
          )}

          {vk && (
            <a
              href={vk}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-full text-blue-700 hover:bg-blue-50 transition-colors"
              title="ВКонтакте"
            >
              <VKIcon />
            </a>
          )}

          {max && (
            <a
              href={max}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-full text-purple-600 hover:bg-purple-50 transition-colors"
              title="MAX"
            >
              <MaxIcon />
            </a>
          )}

          <Link href="/account" className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
            <User className="w-5 h-5" />
          </Link>

          <button
            onClick={openCart}
            className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600"
            aria-label="Корзина"
          >
            <ShoppingCart className="w-5 h-5" />
            {count() > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {count()}
              </span>
            )}
          </button>

          <button
            className="md:hidden p-2 rounded-full hover:bg-gray-100"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t bg-white px-4 py-3 flex flex-col gap-3">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-gray-700 py-1"
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {navPages.map((p) => (
            <Link
              key={p.id}
              href={getPageUrl(p)}
              className="text-sm font-medium text-gray-700 py-1"
              onClick={() => setMenuOpen(false)}
            >
              {p.headerLabel || p.title}
            </Link>
          ))}
          <a href={`tel:+${phoneClean}`} className="text-sm font-medium text-rose-500 flex items-center gap-2">
            <Phone className="w-4 h-4" /> {phone}
          </a>
          <div className="flex items-center gap-3 mt-1">
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="text-green-600" title="WhatsApp">
                <WhatsAppIcon />
              </a>
            )}
            {telegram && (
              <a href={telegram} target="_blank" rel="noopener noreferrer" className="text-sky-500" title="Telegram">
                <TelegramIcon />
              </a>
            )}
            {vk && (
              <a href={vk} target="_blank" rel="noopener noreferrer" className="text-blue-700" title="ВКонтакте">
                <VKIcon />
              </a>
            )}
            {max && (
              <a href={max} target="_blank" rel="noopener noreferrer" className="text-purple-600" title="MAX">
                <MaxIcon />
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
