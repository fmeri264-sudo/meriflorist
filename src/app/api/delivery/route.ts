import { NextRequest, NextResponse } from 'next/server'
import { calculateDeliveryCost } from '@/lib/yandex-delivery'

export async function POST(req: NextRequest) {
  const { address, selfPickup } = await req.json()

  if (selfPickup) return NextResponse.json({ price: 0 })
  if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 })

  const result = await calculateDeliveryCost(address)
  return NextResponse.json(result ?? { price: null })
}
