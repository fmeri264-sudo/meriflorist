import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import type { SiteSettings } from '@/lib/settings'

export default function HeroSection({ settings, fallbackImage }: { settings: SiteSettings; fallbackImage?: string }) {
  const image = settings.heroImageUrl || fallbackImage
  const href = settings.heroButtonUrl.startsWith('/') && !settings.heroButtonUrl.startsWith('//') ? settings.heroButtonUrl : '/catalog'
  return (
    <section className="mary-hero">
      <div className="mary-hero-copy">
        <p className="mary-eyebrow">Ваш личный флорист в Петербурге</p>
        <h1>{settings.heroTitle}</h1>
        <p className="mary-hero-description">{settings.heroDescription}</p>
        <div className="mary-hero-actions flex flex-wrap items-center gap-5 mt-8">
          <Link href={href} className="mary-button">{settings.heroButtonText}</Link>
          <Link href="/contacts" className="mary-text-link inline-flex items-center gap-2">Помочь с выбором <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
        <p className="mary-signature">С теплом, Мэри</p>
      </div>
      <div className="mary-hero-photo">
        {image ? (
          <>
            <Image src={image} alt="Букет, собранный флористами Мэри" fill priority sizes="(max-width: 767px) 100vw, 62vw" className={settings.heroMobileImageUrl ? 'object-cover hidden md:block' : 'object-cover'} style={{ objectPosition: settings.heroImagePosition }} />
            {settings.heroMobileImageUrl && <Image src={settings.heroMobileImageUrl} alt="Букет Мэри" fill priority sizes="100vw" className="object-cover md:hidden" style={{ objectPosition: settings.heroImagePosition }} />}
          </>
        ) : <div className="mary-photo-placeholder"><span aria-hidden="true">✿</span><p>Цветы для ваших особенных моментов</p></div>}
      </div>
    </section>
  )
}
