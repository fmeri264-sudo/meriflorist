import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSettings } from '@/lib/settings'
import { HOME_SELECTION_ID, HOME_SELECTION_LIMIT, parseHomeSelection } from '@/lib/home-selection'

function section(settings: Awaited<ReturnType<typeof getSettings>>) {
  const config = parseHomeSelection(settings.homeSelectionConfig, settings.homeSelectionTitle)
  return {
    id: HOME_SELECTION_ID, title: config.title, subtitle: config.subtitle,
    type: 'products', visible: config.visible, sort: -1,
    bannerUrl: null, linkUrl: '/catalog', linkText: 'Все букеты →',
    config: { pinnedProductIds: config.pinnedProductIds, limit: HOME_SELECTION_LIMIT },
  }
}

export async function GET() {
  return NextResponse.json(section(await getSettings()))
}

export async function PUT(req: NextRequest) {
  const data = await req.json()
  const current = section(await getSettings())
  const ids = data.config?.pinnedProductIds ?? current.config.pinnedProductIds
  if (!Array.isArray(ids) || ids.length > HOME_SELECTION_LIMIT || ids.some(id => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: 'Выберите не более 4 товаров с разными ID.' }, { status: 400 })
  }
  const value = JSON.stringify({
    title: typeof data.title === 'string' ? data.title : current.title,
    subtitle: typeof data.subtitle === 'string' ? data.subtitle : current.subtitle,
    visible: typeof data.visible === 'boolean' ? data.visible : current.visible,
    pinnedProductIds: ids,
  })
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_ANON_KEY!
  const response = await fetch(`${url}/rest/v1/SiteSettings?on_conflict=key`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ key: 'homeSelectionConfig', value }),
  })
  if (!response.ok) {
    console.error('Home selection save failed:', response.status)
    return NextResponse.json({ error: 'Не удалось сохранить «Выбор Мэри».' }, { status: 502 })
  }
  revalidatePath('/')
  return NextResponse.json({ ok: true })
}
