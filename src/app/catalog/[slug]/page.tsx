import { getProductBySlug, getProducts, getProductsByGroupId } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import ProductPageClient from './ProductPageClient'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return {}
  return {
    title: `${product.name} — Meri Florist`,
    description: product.description ?? product.composition ?? undefined,
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const primaryColor = product.colors && product.colors.length > 0 ? product.colors[0] : null

  const [all, addons, groupVariants, colorSiblings] = await Promise.all([
    getProducts({ inStock: true, limit: 60 }),
    getProducts({ isAddon: true, limit: 50 }).catch(() => []),
    product.groupId ? getProductsByGroupId(product.groupId).catch(() => []) : Promise.resolve([]),
    primaryColor ? getProducts({ color: primaryColor, inStock: true, limit: 200 }).catch(() => []) : Promise.resolve([]),
  ])

  // Похожие — та же категория, исключая текущий товар
  const similar = all
    .filter(p => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 4)

  // С этим покупают — хиты из других категорий
  const boughtTogether = all
    .filter(p => p.categoryId !== product.categoryId && p.isHit && p.id !== product.id)
    .slice(0, 4)

  // Если хитов нет — берём просто другие категории
  const withThis = boughtTogether.length >= 2
    ? boughtTogether
    : all.filter(p => p.categoryId !== product.categoryId && p.id !== product.id).slice(0, 4)

  const priceValidUntil = new Date()
  priceValidUntil.setFullYear(priceValidUntil.getFullYear() + 1)

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    ...(product.images.length ? { image: product.images } : {}),
    ...(product.description ? { description: product.description } : {}),
    ...(product.composition ? { material: product.composition } : {}),
    ...((product as any).sku ? { sku: (product as any).sku } : {}),
    brand: { '@type': 'Brand', name: 'Meri Florist' },
    offers: {
      '@type': 'Offer',
      url: `https://meriflorist.ru/catalog/${product.slug}`,
      priceCurrency: 'RUB',
      price: product.price,
      priceValidUntil: priceValidUntil.toISOString().split('T')[0],
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'Meri Florist', url: 'https://meriflorist.ru' },
      // DeliveryChargeSpecification — цена доставки в поиске (Яндекс / Google)
      priceSpecification: [
        {
          '@type': 'DeliveryChargeSpecification',
          price: 200,
          priceCurrency: 'RUB',
          eligibleRegion: {
            '@type': 'Place',
            address: { '@type': 'PostalAddress', addressLocality: 'Санкт-Петербург', addressCountry: 'RU' },
          },
          eligibleTransactionVolume: { '@type': 'PriceSpecification', maxPrice: 1199, priceCurrency: 'RUB' },
        },
        {
          '@type': 'DeliveryChargeSpecification',
          price: 0,
          priceCurrency: 'RUB',
          eligibleRegion: {
            '@type': 'Place',
            address: { '@type': 'PostalAddress', addressLocality: 'Санкт-Петербург', addressCountry: 'RU' },
          },
          eligibleTransactionVolume: { '@type': 'PriceSpecification', minPrice: 1200, priceCurrency: 'RUB' },
        },
      ],
      // OfferShippingDetails — для Google Shopping и Яндекс.Маркет
      shippingDetails: [
        {
          '@type': 'OfferShippingDetails',
          shippingLabel: 'Доставка курьером Яндекс.Доставка',
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
      ],
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />
      <ProductPageClient
        product={product as any}
        similar={similar as any}
        boughtTogether={withThis as any}
        addons={addons as any}
        groupVariants={groupVariants as any}
        colorSiblings={colorSiblings as any}
      />
    </>
  )
}
