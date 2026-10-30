import { NextRequest, NextResponse } from 'next/server'
import { createDeliveryClaim, getDeliveryClaimInfo } from '@/lib/yandex-delivery'

const SB_URL = process.env.SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }

async function getOrder(id: string) {
  const res = await fetch(
    `${SB_URL}/rest/v1/Order?id=eq.${id}&select=id,number,address,recipientName,recipientPhone,totalAmount,selfPickup,comment,ydClaimId`,
    { headers: h }
  )
  const rows = await res.json()
  return rows[0] ?? null
}

async function saveClaimId(id: string, ydClaimId: string, ydStatus: string) {
  await fetch(`${SB_URL}/rest/v1/Order?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...h, Prefer: 'return=minimal' },
    body: JSON.stringify({ ydClaimId, ydStatus }),
  })
}

// POST — создать заявку на курьера
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const order = await getOrder(id)

  if (!order) return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
  if (order.selfPickup) return NextResponse.json({ error: 'Самовывоз — курьер не нужен' }, { status: 400 })
  if (!order.address) return NextResponse.json({ error: 'Адрес не указан' }, { status: 400 })

  // Убираем префикс "Самовывоз:" если вдруг попал
  const address = order.address.replace(/^Самовывоз:\s*/i, '')

  const result = await createDeliveryClaim({
    address,
    recipientName: order.recipientName,
    recipientPhone: order.recipientPhone,
    amount: order.totalAmount,
    orderNumber: order.number,
    courierNote: order.comment ?? undefined,
  })

  if (result.error && !result.claimId) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  await saveClaimId(id, result.claimId, result.status)
  return NextResponse.json({ claimId: result.claimId, status: result.status })
}

// GET — получить статус существующей заявки
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const order = await getOrder(id)

  if (!order) return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
  if (!order.ydClaimId) return NextResponse.json({ error: 'Заявка не создана' }, { status: 404 })

  const info = await getDeliveryClaimInfo(order.ydClaimId)
  await saveClaimId(id, order.ydClaimId, info.status)

  return NextResponse.json({ claimId: order.ydClaimId, ...info })
}
