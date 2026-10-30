import { NextResponse } from 'next/server'
import { DISTRICTS } from '@/lib/districts'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

export async function GET() {
  try {
    const res = await fetch(`${SB}/rest/v1/Districts?select=slug,data`, { headers: H, cache: 'no-store' })
    const rows: { slug: string; data: object }[] = res.ok ? await res.json() : []
    const dbMap = Object.fromEntries(rows.map(r => [r.slug, r.data]))
    const list = DISTRICTS.map(d => dbMap[d.slug] ?? d)
    return NextResponse.json(list)
  } catch {
    return NextResponse.json(DISTRICTS)
  }
}
