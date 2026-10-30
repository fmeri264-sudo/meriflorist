import { NextRequest, NextResponse } from 'next/server'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

// Создаём запись в Customer, если ещё нет — чтобы пользователь отображался в CRM
async function syncToCustomer(phone: string) {
  try {
    const withPlus = phone.startsWith('+') ? phone : `+${phone}`
    const withoutPlus = phone.replace(/^\+/, '')
    const filter = `phone.eq.${encodeURIComponent(withPlus)},phone.eq.${encodeURIComponent(withoutPlus)}`
    const check = await fetch(`${SB}/rest/v1/Customer?or=(${filter})&select=id&limit=1`, { headers: h })
    const existing: { id: number }[] = await check.json().catch(() => [])
    if (existing[0]) return
    await fetch(`${SB}/rest/v1/Customer`, {
      method: 'POST',
      headers: { ...h, Prefer: 'return=minimal' },
      body: JSON.stringify({ firstName: '', phone: withPlus, bonuses: 0 }),
    })
  } catch { /* не критично, игнорируем */ }
}

async function findOrCreateUser(phone: string): Promise<number | null> {
  const findRes = await fetch(`${SB}/rest/v1/User?phone=eq.${encodeURIComponent(phone)}&select=id&limit=1`, { headers: h })
  const users: { id: number }[] = await findRes.json().catch(() => [])
  if (users[0]) return users[0].id

  const createRes = await fetch(`${SB}/rest/v1/User`, {
    method: 'POST',
    headers: { ...h, Prefer: 'return=representation' },
    body: JSON.stringify({ phone }),
  })
  if (!createRes.ok) return null
  const rows: { id: number }[] = await createRes.json()
  const userId = rows[0]?.id ?? null
  if (userId) await syncToCustomer(phone)
  return userId
}

export async function GET(req: NextRequest) {
  const phone = new URL(req.url).searchParams.get('phone')
  if (!phone) return NextResponse.json([])

  // При первом входе — создаём пользователя и запись в CRM
  const userId = await findOrCreateUser(phone)
  if (!userId) return NextResponse.json([])

  const remRes = await fetch(
    `${SB}/rest/v1/Reminder?userId=eq.${userId}&select=id,title,date&order=date.asc`,
    { headers: h }
  )
  const rows: { id: number; title: string; date: string }[] = await remRes.json().catch(() => [])
  return NextResponse.json(rows.map(r => ({ id: r.id, name: r.title, date: r.date })))
}

export async function POST(req: NextRequest) {
  const { phone, name, date } = await req.json()
  if (!phone || !name) return NextResponse.json({ error: 'phone и name обязательны' }, { status: 400 })

  const userId = await findOrCreateUser(phone)
  if (!userId) return NextResponse.json({ error: 'Не удалось создать пользователя' }, { status: 400 })

  const dateValue = date ? new Date(date).toISOString() : new Date('2000-01-01').toISOString()

  const res = await fetch(`${SB}/rest/v1/Reminder`, {
    method: 'POST',
    headers: { ...h, Prefer: 'return=representation' },
    body: JSON.stringify({ userId, title: name, date: dateValue, notified: false }),
  })
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 400 })
  const rows: { id: number; title: string; date: string }[] = await res.json()
  const r = rows[0]
  return NextResponse.json({ id: r.id, name: r.title, date: r.date })
}
