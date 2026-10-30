import { NextRequest, NextResponse } from 'next/server'
import { notifyDelivered, notifyCancel } from '@/lib/meribuket'
import { scheduleReviewRequest } from '@/lib/max-bot'

const SB_URL = process.env.SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }

async function sb(path: string, init?: RequestInit) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { ...h, ...(init?.headers ?? {}) } })
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
  return res
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 20
  const offset = (page - 1) * limit

  const [dataRes, countRes] = await Promise.all([
    sb(`Order?select=*,items:OrderItem(*,product:Product(name,images))&order=createdAt.desc&limit=${limit}&offset=${offset}`),
    sb(`Order?select=count`, { headers: { ...h, Prefer: 'count=exact' } }),
  ])

  const orders = await dataRes.json()
  const total = parseInt(countRes.headers.get('content-range')?.split('/')[1] ?? '0')

  return NextResponse.json({ orders, total, page, limit })
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json()
  const res = await sb(`Order?id=eq.${id}`, {
    method: 'PATCH', body: JSON.stringify({ status }),
    headers: { ...h, Prefer: 'return=representation' },
  })
  const rows = await res.json()
  const order = rows[0]

  // Синхронизируем статус с meribuket.ru (fire-and-forget)
  if (order?.number) {
    if (status === 'DELIVERED') {
      notifyDelivered(order.number).catch(() => {})
      // Планируем опрос через 90 минут
      scheduleReviewRequest({
        orderId: order.id,
        orderNumber: order.number,
        recipientName: order.recipientName,
        recipientPhone: order.recipientPhone,
        delayMinutes: 90,
      }).catch(() => {})
    } else if (status === 'CANCELLED') {
      notifyCancel(order.number).catch(() => {})
    }
  }

  return NextResponse.json(order)
}
