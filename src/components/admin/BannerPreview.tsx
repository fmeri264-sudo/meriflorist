'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { SiteSettings } from '@/lib/settings'

export default function BannerPreview({ settings }: { settings: SiteSettings }) {
  const [mobile, setMobile] = useState(false)
  const image = mobile ? settings.heroMobileImageUrl || settings.heroImageUrl : settings.heroImageUrl
  return <div className="border border-gray-200 rounded-lg p-4">
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-sm font-medium mr-auto">Предпросмотр баннера</span>
      <button type="button" aria-pressed={!mobile} onClick={() => setMobile(false)} className={`text-sm border rounded px-3 py-2 ${!mobile ? 'bg-rose-50 border-rose-500' : ''}`}>Компьютер</button>
      <button type="button" aria-pressed={mobile} onClick={() => setMobile(true)} className={`text-sm border rounded px-3 py-2 ${mobile ? 'bg-rose-50 border-rose-500' : ''}`}>Телефон</button>
    </div>
    <div className={`mx-auto overflow-hidden bg-[#faf7f2] border border-rose-100 ${mobile ? 'max-w-[320px]' : ''}`}>
      <div className={mobile ? 'flex flex-col' : 'grid grid-cols-[40fr_60fr]'}>
        <div className={`p-4 ${mobile ? 'contents' : 'self-center'}`}>
          <p className={`font-serif text-2xl text-[#302c2e] ${mobile ? 'order-0 p-4' : ''}`}>{settings.heroTitle}</p>
          <p className={`text-sm leading-relaxed text-gray-600 mt-3 ${mobile ? 'order-2 px-4' : ''}`}>{settings.heroDescription}</p>
          <span className={`inline-block bg-rose-500 text-white text-sm px-4 py-2 mt-4 rounded w-fit ${mobile ? 'order-3 mx-4 mb-4' : ''}`}>{settings.heroButtonText}</span>
        </div>
        <div className={`relative bg-rose-50 ${mobile ? 'order-1 aspect-square' : 'min-h-80'}`}>
          {image ? <Image src={image} alt="Предпросмотр фото баннера" fill sizes="(max-width: 767px) 320px, 420px" className="object-cover" style={{ objectPosition: settings.heroImagePosition }} /> : <p className="p-6 text-sm text-gray-500">Выберите фото. На сайте без него используется фото товара.</p>}
        </div>
      </div>
    </div>
    <p className="text-xs text-gray-500 mt-3">Предпросмотр текущих полей. Чтобы применить изменения на сайте, сохраните соответствующие поля.</p>
  </div>
}
