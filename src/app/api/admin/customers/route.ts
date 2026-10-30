import { NextRequest, NextResponse } from 'next/server'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 30
  const offset = (page - 1) * limit

  let filter = ''
  if (q) {
    const enc = encodeURIComponent(q)
    filter = `&or=(firstName.ilike.*${enc}*,lastName.ilike.*${enc}*,phone.ilike.*${enc}*,email.ilike.*${enc}*)`
  }

  const [dataRes, countRes] = await Promise.all([
    fetch(`${SB}/rest/v1/Customer?select=*&order=createdAt.desc&limit=${limit}&offset=${offset}${filter}`, { headers: h }),
    fetch(`${SB}/rest/v1/Customer?select=id${filter}`, {
      headers: { ...h, Prefer: 'count=exact', Range: '0-0' },
    }),
  ])

  if (!dataRes.ok) {
    const err = await dataRes.text()
    console.error('Customer GET error:', err)
    return NextResponse.json({ customers: [], total: 0, error: err })
  }

  const customers = await dataRes.json()
  const contentRange = countRes.headers.get('Content-Range') ?? ''
  const total = parseInt(contentRange.split('/')[1] ?? '0') || 0

  return NextResponse.json({ customers: Array.isArray(customers) ? customers : [], total })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const res = await fetch(`${SB}/rest/v1/Customer`, {
    method: 'POST',
    headers: { ...h, Prefer: 'return=representation' },
    body: JSON.stringify({
      firstName: body.firstName ?? '',
      lastName: body.lastName || null,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      comment: body.comment || null,
      bonuses: body.bonuses ?? 0,
      points: body.points ?? 0,
      holidays: body.holidays ?? [],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Customer POST error:', err)
    return NextResponse.json({ error: err }, { status: 400 })
  }
  const rows = await res.json()
  return NextResponse.json(Array.isArray(rows) ? rows[0] : rows)
}
