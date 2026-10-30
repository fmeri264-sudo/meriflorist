import { NextRequest } from 'next/server'
import { parsePromoCode } from '@/lib/promocodes'
import { requirePromoAdmin, promoRequest, promoError } from '@/lib/promo-store'

export async function GET(req: NextRequest) {
  try {
    await requirePromoAdmin(req)
    const res = await promoRequest('?order=id.desc')
    return Response.json(await res.json())
  } catch (error) { return promoError(error) }
}

export async function POST(req: NextRequest) {
  try {
    await requirePromoAdmin(req)
    const data = parsePromoCode(await req.json())
    const res = await promoRequest('', { method: 'POST', body: JSON.stringify(data) })
    return Response.json((await res.json())[0], { status: 201 })
  } catch (error) { return promoError(error) }
}
