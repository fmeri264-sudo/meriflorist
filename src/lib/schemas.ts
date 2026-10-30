const SITE_URL = 'https://meriflorist.ru'
const SITE_NAME = 'Meri Florist'

// Доставка курьером Яндекс.Доставка от 200 ₽, бесплатно от 1200 ₽, 1–2 часа ежедневно 8–22
const SHIPPING_DETAILS = [
  {
    '@type': 'OfferShippingDetails',
    shippingLabel: 'Доставка курьером по Санкт-Петербургу',
    shippingRate: { '@type': 'MonetaryAmount', value: '200', currency: 'RUB' },
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: 'RU',
      addressRegion: 'Санкт-Петербург',
    },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'HUR' },
      transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'HUR' },
      cutoffTime: '21:00:00+03:00',
      businessDays: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
      },
    },
  },
  {
    '@type': 'OfferShippingDetails',
    shippingLabel: 'Бесплатная доставка при заказе от 1200 ₽',
    shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'RUB' },
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: 'RU',
      addressRegion: 'Санкт-Петербург',
    },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'HUR' },
      transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'HUR' },
      cutoffTime: '21:00:00+03:00',
      businessDays: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
      },
    },
  },
]

export interface LocalBusinessSchemaOptions {
  phone?: string
  logoUrl?: string
  description?: string
}

export function localBusinessSchema(opts: LocalBusinessSchemaOptions = {}) {
  const phone = opts.phone?.replace(/\D/g, '') ?? ''
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'Florist'],
    '@id': `${SITE_URL}/#business`,
    name: SITE_NAME,
    url: SITE_URL,
    ...(opts.logoUrl ? { logo: opts.logoUrl } : {}),
    ...(phone ? { telephone: `+${phone}` } : {}),
    description: opts.description ?? 'Авторские букеты из живых цветов с доставкой по Санкт-Петербургу от 1 часа. Яндекс.Доставка, фото перед отправкой, свежесть гарантируем.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Санкт-Петербург',
      addressRegion: 'Санкт-Петербург',
      addressCountry: 'RU',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 59.9311,
      longitude: 30.3609,
    },
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
      url: `${SITE_URL}/catalog`,
    },
    // Яндекс.Доставка — уточняем что доставка через партнёра
    potentialAction: {
      '@type': 'OrderAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/catalog`,
        actionPlatform: 'http://schema.org/DesktopWebPlatform',
      },
    },
  }
}

export interface ProductSchemaOptions {
  name: string
  slug: string
  description?: string | null
  images: string[]
  price: number
  inStock: boolean
  sku?: string | null
  composition?: string | null
}

export function productSchema(p: ProductSchemaOptions) {
  const priceValidUntil = new Date()
  priceValidUntil.setFullYear(priceValidUntil.getFullYear() + 1)

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    ...(p.images.length ? { image: p.images } : {}),
    ...(p.description ? { description: p.description } : {}),
    ...(p.composition ? { material: p.composition } : {}),
    ...(p.sku ? { sku: p.sku } : {}),
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/catalog/${p.slug}`,
      priceCurrency: 'RUB',
      price: p.price,
      priceValidUntil: priceValidUntil.toISOString().split('T')[0],
      itemCondition: 'https://schema.org/NewCondition',
      availability: p.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      shippingDetails: SHIPPING_DETAILS,
      // DeliveryChargeSpecification для Яндекс
      priceSpecification: [
        {
          '@type': 'DeliveryChargeSpecification',
          price: 200,
          priceCurrency: 'RUB',
          eligibleRegion: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Санкт-Петербург',
              addressCountry: 'RU',
            },
          },
          eligibleTransactionVolume: {
            '@type': 'PriceSpecification',
            maxPrice: 1199,
            priceCurrency: 'RUB',
          },
        },
        {
          '@type': 'DeliveryChargeSpecification',
          price: 0,
          priceCurrency: 'RUB',
          eligibleRegion: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Санкт-Петербург',
              addressCountry: 'RU',
            },
          },
          eligibleTransactionVolume: {
            '@type': 'PriceSpecification',
            minPrice: 1200,
            priceCurrency: 'RUB',
          },
        },
      ],
    },
  }
}

export interface DistrictSchemaOptions {
  name: string
  slug: string
  description: string
  phone?: string
  zones: { name: string; time: string; price: number; freeFrom: number }[]
}

export function districtSchema(opts: DistrictSchemaOptions) {
  const phone = opts.phone?.replace(/\D/g, '') ?? ''
  const zoneShipping = opts.zones.map(z => ({
    '@type': 'DeliveryChargeSpecification',
    name: z.name,
    price: z.price,
    priceCurrency: 'RUB',
    eligibleRegion: {
      '@type': 'Place',
      name: z.name,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Санкт-Петербург',
        addressCountry: 'RU',
      },
    },
    eligibleTransactionVolume: {
      '@type': 'PriceSpecification',
      maxPrice: z.freeFrom - 1,
      priceCurrency: 'RUB',
    },
  }))

  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'Florist'],
    '@id': `${SITE_URL}/dostavka-cvetov/${opts.slug}#business`,
    name: `${SITE_NAME} — доставка цветов ${opts.name}`,
    url: `${SITE_URL}/dostavka-cvetov/${opts.slug}`,
    ...(phone ? { telephone: `+${phone}` } : {}),
    description: opts.description,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Санкт-Петербург',
      addressRegion: opts.name,
      addressCountry: 'RU',
    },
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
      opens: '08:00',
      closes: '22:00',
    }],
    priceRange: '790₽–15000₽',
    areaServed: { '@type': 'Place', name: opts.name },
    makesOffer: zoneShipping.map(spec => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', name: `Доставка цветов — ${spec.name}` },
      priceSpecification: spec,
    })),
  }
}

export interface FaqSchemaOptions {
  faqs: { q: string; a: string }[]
}

export function faqSchema(opts: FaqSchemaOptions) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: opts.faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}
