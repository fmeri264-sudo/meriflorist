import { NextRequest } from 'next/server'
import { priceCheckoutItems } from '@/lib/checkout-pricing'
import { promoDiscount } from '@/lib/promocodes'
import { findPromoCode, promoError } from '@/lib/promo-store'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const promo = await findPromoCode(body.code)
    const items = await priceCheckoutItems(body.items, async path => {
      const key = process.env.SUPABASE_ANON_KEY!
      const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Product database ${res.status}`)
      return res
    })
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)
    return Response.json({ code: promo.code, discountType: promo.discountType,
      discountValue: promo.discountValue, discount: promoDiscount(promo, subtotal), subtotal })
  } catch (error) { return promoError(error) }
}
