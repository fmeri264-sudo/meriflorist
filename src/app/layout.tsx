import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CartSidebar from '@/components/cart/CartSidebar'
import { getSettings } from '@/lib/settings'
import { getPublishedPageNavs } from '@/lib/pages'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'Meri Florist — доставка цветов в Санкт-Петербурге',
  description:
    'Авторские букеты из живых цветов с доставкой от 2 часов по Санкт-Петербургу. Фото перед отправкой, гарантия свежести 48 часов.',
  keywords: 'цветы СПб, доставка цветов, букеты, розы, флорист',
  openGraph: {
    title: 'Meri Florist — доставка цветов в Санкт-Петербурге',
    description: 'Авторские букеты из живых цветов с доставкой от 2 часов',
    url: 'https://meriflorist.ru',
    siteName: 'Meri Florist',
    locale: 'ru_RU',
    type: 'website',
  },
  // 👇 ДОБАВИТЬ ВОТ ЭТУ СТРОКУ:
  verification: {
    yandex: ['b875e56024ae1ed9', '53525d9abb547230'],
    google: 'tpSiy1GE83nEKPhKdt4j9n3DdrWW0kXGvVd-xRxSr2A',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [settings, allPages] = await Promise.all([getSettings(), getPublishedPageNavs()])
  const navPages = allPages.filter(p => p.showInHeader)
  const footerPages = allPages.filter(p => p.showInFooter)
  const phone = settings.phone?.replace(/\D/g, '') ?? ''
  const lbLd = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'Florist'],
    '@id': 'https://meriflorist.ru/#business',
    name: 'Meri Florist',
    url: 'https://meriflorist.ru',
    ...(settings.logoUrl ? { logo: settings.logoUrl } : {}),
    ...(phone ? { telephone: `+${phone}` } : {}),
    description: 'Авторские букеты из живых цветов с доставкой по Санкт-Петербургу от 1 часа. Яндекс.Доставка, фото перед отправкой.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Санкт-Петербург',
      addressRegion: 'Санкт-Петербург',
      addressCountry: 'RU',
    },
    geo: { '@type': 'GeoCoordinates', latitude: 59.9311, longitude: 30.3609 },
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
      opens: '08:00',
      closes: '22:00',
    }],
    priceRange: '790₽–15000₽',
    currenciesAccepted: 'RUB',
    paymentAccepted: 'Наличные, банковская карта, СБП',
    areaServed: { '@type': 'City', name: 'Санкт-Петербург' },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Букеты и цветы с доставкой в Санкт-Петербурге',
      url: 'https://meriflorist.ru/catalog',
    },
  }

  return (
    <html lang="ru">
      <head>
        {/* 1. VK Pixel */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){
                w[l]=w[l]||[];
                w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
                var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
                j.async=true;
                j.src='https://vk.com/js/api/xd.js?pixel='+i+dl;
                f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','id=3776021');
              
              var _tmr = window._tmr || (window._tmr = []);
              _tmr.push({id: "3776021", type: "pageView", start: (new Date()).getTime()});
            `,
          }}
        />

        {/* 2. Top.Mail.Ru */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              var _tmr = window._tmr || (window._tmr = []);
              _tmr.push({id: "3776021", type: "pageView", start: (new Date()).getTime()});
              (function (d, w, id) {
                if (d.getElementById(id)) return;
                var ts = d.createElement("script");
                ts.type = "text/javascript";
                ts.async = true;
                ts.id = id;
                ts.src = "https://top-fwz1.mail.ru/js/code.js";
                var f = function () {
                  var s = d.getElementsByTagName("script")[0];
                  s.parentNode.insertBefore(ts, s);
                };
                if (w.opera == "[object Opera]") {
                  d.addEventListener("DOMContentLoaded", f, false);
                } else {
                  f();
                }
              })(document, window, "tmr-code");
            `,
          }}
        />
        
        {/* 3. Noscript для Top.Mail.Ru */}
        <noscript>
          <div>
            <img
              src="https://top-fwz1.mail.ru/counter?id=3776021;js=na"
              style={{ position: 'absolute', left: '-9999px' }}
              alt="Top.Mail.Ru"
            />
          </div>
        </noscript>

        {/* 4. Schema.org (был в body) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(lbLd) }}
        />
      </head>
      <body className={inter.className}>
        <Header settings={settings} navPages={navPages} />
        <main className="min-h-screen">{children}</main>
        <Footer settings={settings} footerPages={footerPages} />
        <CartSidebar />
      </body>
    </html>
  )
}