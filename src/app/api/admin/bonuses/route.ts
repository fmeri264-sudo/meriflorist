import { NextRequest, NextResponse } from 'next/server'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

export async function GET() {
  const res = await fetch(`${SB}/rest/v1/BonusRule?order=sortOrder.asc,id.asc`, { headers: h, cache: 'no-store' })
  const data = res.ok ? await res.json() : []
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`${SB}/rest/v1/BonusRule`, {
    method: 'POST',
    headers: { ...h, Prefer: 'return=representation' },
    body: JSON.stringify({
      name: body.name,
      bonusPercent: body.bonusPercent,
      conditionType: body.conditionType,
      conditionValue: body.conditionValue ?? null,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
    }),
  })
  const data = await res.json()
  return NextResponse.json(data[0] ?? data)
}
