import { NextRequest, NextResponse } from 'next/server'
import { sendRatingRequest } from '@/lib/max-bot'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const SB_H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

export async function POST(req: NextRequest) {
  // Защита от случайных вызовов
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()

  // Берём все pending запросы у которых время пришло И есть maxUserId
  const res = await fetch(
    `${SB}/rest/v1/ReviewRequests?status=eq.pending&scheduledAt=lte.${now}&maxUserId=not.is.null&select=*&limit=20`,
    { headers: SB_H, cache: 'no-store' },
  )
  const requests: {
    id: number
    maxUserId: number
    recipientName: string
    orderNumber: string
  }[] = res.ok ? await res.json() : []

  let sent = 0
  let skipped = 0

  for (const r of requests) {
    try {
      await sendRatingRequest(r.maxUserId, r.recipientName, r.id)

      await fetch(`${SB}/rest/v1/ReviewRequests?id=eq.${r.id}`, {
        method: 'PATCH',
        headers: { ...SB_H, Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'sent', sentAt: new Date().toISOString() }),
      })
      sent++
    } catch (e) {
      console.error(`Review request ${r.id} failed:`, e)
      skipped++
    }
  }

  // Помечаем как skipped те у кого нет maxUserId (покупатель не открыл бот)
  await fetch(
    `${SB}/rest/v1/ReviewRequests?status=eq.pending&scheduledAt=lte.${now}&maxUserId=is.null`,
    {
      method: 'PATCH',
      headers: { ...SB_H, Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'skipped' }),
    },
  )

  return NextResponse.json({ ok: true, sent, skipped })
}
