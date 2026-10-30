import { CheckoutError } from './promocodes'

export type DatabaseRequest = (path: string, init?: RequestInit) => Promise<Response>
export interface PricedItem {
  productId: number
  sku: string
  name: string
  image: string
  size: string
  price: number
  qty: number
}
interface ProductRow {
  id: number; name: string; sku?: string; images?: string[]
  price: number; priceL?: number | null; inStock: boolean; isVisible?: boolean
}
export async function priceCheckoutItems(input: unknown, db: DatabaseRequest): Promise<PricedItem[]> {
  if (!Array.isArray(input) || input.length === 0 || input.length > 100) {
    throw new CheckoutError('Добавьте товары в корзину (не более 100 позиций)')
  }
  const selections = input.map(item => {
    if (!item || !Number.isSafeInteger(item.productId) || item.productId <= 0 ||
        !Number.isSafeInteger(item.qty) || item.qty < 1 || item.qty > 99 ||
        !['S', 'M', 'L'].includes(item.size)) {
      throw new CheckoutError('Проверьте товары и количество в корзине')
    }
    return { productId: item.productId as number, qty: item.qty as number, size: item.size as string }
  })
  const ids = [...new Set(selections.map(item => item.productId))]
  const products: ProductRow[] = await (await db(`Product?id=in.(${ids.join(',')})&select=*`)).json()
  return selections.map(item => {
    const product = products.find(product => product.id === item.productId)
    if (!product || !product.inStock || product.isVisible === false) {
      throw new CheckoutError('Один из товаров больше недоступен. Обновите корзину.')
    }
    const price = item.size === 'L' && product.priceL ? product.priceL : product.price
    if (!Number.isSafeInteger(price) || price < 0) throw new CheckoutError('Не удалось определить цену товара')
    return { ...item, price, name: product.name, sku: product.sku ?? '', image: product.images?.[0] ?? '' }
  })
}
export function customerPhoneVariants(value: unknown): string[] {
  if (typeof value !== 'string') return []
  let phone = value.replace(/\D/g, '')
  if (phone.length === 10) phone = `7${phone}`
  if (phone.length === 11 && phone.startsWith('8')) phone = `7${phone.slice(1)}`
  if (!/^7\d{10}$/.test(phone)) return []
  return [phone, `+${phone}`, `8${phone.slice(1)}`, phone.slice(1)]
}
export async function checkoutCustomer(phone: unknown, db: DatabaseRequest): Promise<{ id: number; bonuses: number } | null> {
  const variants = customerPhoneVariants(phone)
  if (!variants.length) throw new CheckoutError('Укажите корректный номер телефона')
  const filter = variants.map(v => `phone.eq.${encodeURIComponent(v)}`).join(',')
  const rows = await (await db(`Customer?or=(${filter})&select=id,bonuses&order=bonuses.desc&limit=1`)).json()
  return rows[0] ?? null
}
