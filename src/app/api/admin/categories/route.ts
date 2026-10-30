import { NextRequest, NextResponse } from 'next/server'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

export async function GET() {
  const res = await fetch(`${SB}/rest/v1/Category?order=sort.asc`, { headers: h })
  return NextResponse.json(await res.json())
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  const res = await fetch(`${SB}/rest/v1/Category`, {
    method: 'POST', headers: { ...h, Prefer: 'return=representation' },
    body: JSON.stringify(data),
  })
  const rows = await res.json()
  return NextResponse.json(rows[0], { status: 201 })
}
