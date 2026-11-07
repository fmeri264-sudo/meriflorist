import Link from 'next/link'
import Image from 'next/image'
import { DISTRICTS } from '@/lib/districts'
import type { SiteSettings } from '@/lib/settings'
import type { PageNav } from '@/lib/pages'
import { getPageUrl } from '@/lib/pages'

interface Props {
  settings?: Partial<SiteSettings>
  footerPages?: PageNav[]
}

export default function Footer({ settings = {}, footerPages = [] }: Props) {
  const phone = settings.phone ?? '+7 (800) 123-45-67'
  const phoneDigits = phone.replace(/\D/g, '')
  const whatsapp = settings.whatsapp ?? ''
  const telegram = settings.telegram ?? ''
  const email = settings.footerEmail ?? ''
  const siteName = settings.siteName ?? 'Meri Florist'
  const legalLines = settings.footerLegal
    ? settings.footerLegal.split('\n').filter(Boolean)
    : []

  return (
    <footer className="mary-footer text-gray-300 pt-12 pb-6 mt-20">
      {/* Районы SEO */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <p className="text-white font-semibold mb-3 text-sm">Доставка цветов по районам СПб</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {DISTRICTS.map(d => (
            <Link
              key={d.slug}
              href={`/dostavka-cvetov/${d.slug}`}
              className="text-sm text-gray-400 hover:text-white transition"
            >
              {d.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 border-t border-gray-800 pt-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <Link href="/" aria-label={siteName} className="inline-block mb-4"><Image src="/brand/mary-horizontal-white.png" alt={`${siteName} — Ваш личный флорист`} width={240} height={100} className="w-56 h-auto" /></Link>
          <p className="text-sm leading-relaxed">
            Авторские букеты с доставкой по Санкт-Петербургу. Работаем ежедневно с 8:00 до 22:00.
          </p>
        </div>

        <div>
          <p className="text-white font-semibold mb-3">Навигация</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/catalog" className="hover:text-white">Каталог</Link></li>
            <li><Link href="/delivery" className="hover:text-white">Доставка и оплата</Link></li>
            <li><Link href="/reviews" className="hover:text-white">Отзывы</Link></li>
            <li><Link href="/contacts" className="hover:text-white">Контакты</Link></li>
            {footerPages.map(p => (
              <li key={p.id}>
                <Link href={getPageUrl(p)} className="hover:text-white">{p.title}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-white font-semibold mb-3">Контакты</p>
          <ul className="space-y-2 text-sm">
            {phoneDigits && (
              <li>
                <a href={`tel:+${phoneDigits}`} className="hover:text-white">{phone}</a>
              </li>
            )}
            {whatsapp && (
              <li>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="hover:text-white">WhatsApp</a>
              </li>
            )}
            {telegram && (
              <li>
                <a href={telegram} target="_blank" rel="noopener noreferrer" className="hover:text-white">Telegram</a>
              </li>
            )}
            {email && (
              <li>
                <a href={`mailto:${email}`} className="hover:text-white">{email}</a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <p className="text-white font-semibold mb-3">Способы оплаты</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {['Visa', 'MasterCard', 'Мир', 'СБП', 'Наличные'].map((m) => (
              <span key={m} className="bg-gray-700 text-xs px-2 py-1 rounded">{m}</span>
            ))}
          </div>

        </div>
      </div>

      {/* Юридическая информация */}
      {legalLines.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-6 pt-6 border-t border-gray-800">
          <p className="text-xs text-gray-500 leading-relaxed">
            {legalLines.map((line, i) => (
              <span key={i}>{line}{i < legalLines.length - 1 && <br />}</span>
            ))}
          </p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 mt-6 pt-6 border-t border-gray-700 flex flex-col md:flex-row justify-between gap-3 text-xs text-gray-500">
        <p>© {new Date().getFullYear()} {siteName}. Все права защищены.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/rules" className="hover:text-gray-300">Правила сайта</Link>
          <Link href="/privacy" className="hover:text-gray-300">Политика конфиденциальности</Link>
          <Link href="/oferta" className="hover:text-gray-300">Оферта сайта</Link>
          <Link href="/consent" className="hover:text-gray-300">Согласие на обработку данных</Link>
          <Link href="/vozvrat" className="hover:text-gray-300">Возврат и обмен</Link>
        </div>
      </div>
    </footer>
  )
}
