import { NextRequest, NextResponse } from 'next/server'
import { cancelPayment } from '@/lib/tbank'

const SB_URL = process.env.SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Получаем заказ
  const res = await fetch(`${SB_URL}/rest/v1/Order?id=eq.${id}&select=id,totalAmount,paymentStatus,tbankPaymentId&limit=1`, { headers: h })
  const rows = await res.json()
  const order = rows[0]

  if (!order) return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
  if (order.paymentStatus !== 'PAID') return NextResponse.json({ error: 'Заказ не оплачен' }, { status: 400 })
  if (!order.tbankPaymentId) return NextResponse.json({ error: 'Нет ID платежа T-Bank' }, { status: 400 })

  // Возврат через T-Bank
  const result = await cancelPayment({ paymentId: order.tbankPaymentId })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 })

  // Обновляем статус в базе
  await fetch(`${SB_URL}/rest/v1/Order?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...h, Prefer: 'return=minimal' },
    body: JSON.stringify({ paymentStatus: 'REFUNDED' }),
  })

  return NextResponse.json({ ok: true })
}
