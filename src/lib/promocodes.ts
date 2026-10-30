export type DiscountType = 'percent' | 'fixed'
export interface PromoCode {
  id: number
  code: string
  name: string
  discountType: DiscountType
  discountValue: number
  isActive: boolean
}
export class CheckoutError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}
export function normalizePromoCode(value: unknown): string {
  if (typeof value !== 'string') throw new CheckoutError('Введите промокод')
  const code = value.trim().toUpperCase()
  if (!/^[A-ZА-ЯЁ0-9_-]{2,40}$/u.test(code)) {
    throw new CheckoutError('Промокод: от 2 до 40 букв, цифр, дефисов или знаков подчёркивания')
  }
  return code
}
export function parsePromoCode(input: unknown): Omit<PromoCode, 'id'> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CheckoutError('Некорректные параметры промокода')
  const body = input as Record<string, unknown>
  const code = normalizePromoCode(body.code)
  if (body.discountType !== 'percent' && body.discountType !== 'fixed') {
    throw new CheckoutError('Выберите скидку в процентах или рублях')
  }
  const value = body.discountValue
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0 ||
      value > (body.discountType === 'percent' ? 100 : 10_000_000)) {
    throw new CheckoutError(body.discountType === 'percent'
      ? 'Скидка должна быть целым числом от 1 до 100%' : 'Укажите целую сумму скидки от 1 до 10 000 000 ₽')
  }
  if (typeof body.isActive !== 'boolean') throw new CheckoutError('Укажите, активен ли промокод')
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (name.length > 120) throw new CheckoutError('Название должно быть не длиннее 120 символов')
  return { code, name, discountType: body.discountType, discountValue: value, isActive: body.isActive }
}
export function promoDiscount(promo: PromoCode, subtotal: number): number {
  if (!promo.isActive) throw new CheckoutError('Промокод не найден или отключён')
  if (!Number.isSafeInteger(subtotal) || subtotal < 0) throw new CheckoutError('Некорректная стоимость товаров')
  // Stored order amounts are whole rubles. Delivery is not discounted.
  return Math.min(subtotal, promo.discountType === 'percent'
    ? Math.round(subtotal * promo.discountValue / 100) : promo.discountValue)
}
export function calculateTotals(subtotal: number, shipping: number, discount: number, requestedBonuses: number, balance: number) {
  for (const value of [subtotal, shipping, discount, requestedBonuses, balance]) {
    if (!Number.isSafeInteger(value) || value < 0) throw new CheckoutError('Некорректная сумма заказа')
  }
  if (discount > 0 && requestedBonuses > 0) throw new CheckoutError('Выберите промокод или бонусы — вместе они не применяются')
  const afterPromo = subtotal - Math.min(discount, subtotal) + shipping
  const bonusUsed = Math.min(requestedBonuses, balance, afterPromo)
  return { subtotal, deliveryCost: shipping, promoDiscount: Math.min(discount, subtotal), bonusUsed, total: afterPromo - bonusUsed }
}
