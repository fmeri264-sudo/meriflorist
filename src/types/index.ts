export interface Product {
  id: number
  name: string
  slug: string
  description?: string
  composition?: string
  price: number
  priceL?: number
  priceXL?: number
  images: string[]
  video?: string
  inStock: boolean
  isHit: boolean
  isNew: boolean
  categoryId: number
  categoryIds?: number[]
  category?: Category
  tags: string[]
  reviews?: Review[]
  sku?: string | null
  colors?: string[]
  packaging?: string | null
  flowerCount?: number | null
  width?: number | null
  height?: number | null
  groupId?: string | null
  isAddon?: boolean
  addonCategory?: string | null
}

export interface Category {
  id: number
  name: string
  slug: string
  image?: string
  sort: number
}

export interface CartItem {
  product: Product
  size: 'S' | 'M' | 'L'
  qty: number
  price: number
}

export interface OrderForm {
  recipientName: string
  recipientPhone: string
  address: string
  deliveryDate: string
  deliveryTime: string
  cardText: string
  photoReport: boolean
  comment: string
  paymentMethod: 'ONLINE' | 'CASH' | 'SBP'
  selfPickup: boolean
}

export interface DeliveryZone {
  zone: number
  cost: number
  minTime: number
}

export interface Review {
  id: number
  author: string
  text: string
  rating: number
  image?: string
  createdAt: string
}

export interface FilterState {
  priceMin: number
  priceMax: number
  categorySlug: string
  tags: string[]
  deliveryToday: boolean
  selfPickup: boolean
}
