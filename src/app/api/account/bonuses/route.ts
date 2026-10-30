import { NextRequest, NextResponse } from 'next/server'
import { customerPhoneVariants } from '@/lib/checkout-pricing'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

export async function GET(req: NextRequest) {
  const phone = new URL(req.url).searchParams.get('phone')
  if (!phone) return NextResponse.json({ bonuses: 0 })

  const variants = customerPhoneVariants(phone)
  if (!variants.length) return NextResponse.json({ bonuses: 0 })

  // Ищем все записи по всем вариантам телефона и берём максимальный баланс
  const filter = variants.map(v => `phone.eq.${encodeURIComponent(v)}`).join(',')
  const res = await fetch(
    `${SB}/rest/v1/Customer?or=(${filter})&select=bonuses`,
    { headers: h, cache: 'no-store' }
  )

  if (res.ok) {
    const rows: { bonuses: number }[] = await res.json()
    if (rows.length) {
      const maxBonuses = Math.max(...rows.map(r => r.bonuses ?? 0))
      return NextResponse.json({ bonuses: maxBonuses })
    }
  }

  return NextResponse.json({ bonuses: 0 })
}
