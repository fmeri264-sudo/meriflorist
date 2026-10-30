import { NextRequest } from 'next/server'
import { CheckoutError, parsePromoCode } from '@/lib/promocodes'
import { requirePromoAdmin, promoRequest, promoError } from '@/lib/promo-store'

type Context = { params: Promise<{ id: string }> }
async function path(context: Context) {
  const { id } = await context.params
  if (!/^[1-9]\d*$/.test(id)) throw new CheckoutError('Некорректный ID промокода')
  return `?id=eq.${id}`
}
export async function PUT(req: NextRequest, context: Context) {
  try {
    await requirePromoAdmin(req)
    const query = await path(context)
    const data = parsePromoCode(await req.json())
    const res = await promoRequest(query, { method: 'PATCH', body: JSON.stringify(data) })
    const rows = await res.json()
    if (!rows.length) throw new CheckoutError('Промокод не найден', 404)
    return Response.json(rows[0])
  } catch (error) { return promoError(error) }
}
export async function DELETE(req: NextRequest, context: Context) {
  try {
    await requirePromoAdmin(req)
    await promoRequest(await path(context), { method: 'DELETE' })
    return Response.json({ ok: true })
  } catch (error) { return promoError(error) }
}
