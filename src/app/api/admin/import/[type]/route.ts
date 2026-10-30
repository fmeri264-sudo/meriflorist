import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

async function sbGet(path: string) {
  const res = await fetch(`${SB}/rest/v1/${path}`, { headers: h, cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

async function sbPatch(path: string, body: unknown) {
  return fetch(`${SB}/rest/v1/${path}`, {
    method: 'PATCH', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify(body),
  })
}

async function sbPost(path: string, body: unknown) {
  return fetch(`${SB}/rest/v1/${path}`, {
    method: 'POST', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify(body),
  })
}

function parseRows(buffer: ArrayBuffer): Record<string, string>[] {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
}

function str(v: unknown): string { return String(v ?? '').trim() }
function num(v: unknown): number { return parseFloat(str(v).replace(',', '.')) || 0 }
function bool(v: unknown): boolean { const s = str(v).toLowerCase(); return s === 'да' || s === '1' || s === 'true' || s === 'yes' }

export async function POST(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'файл не загружен' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const rows = parseRows(buffer)
  if (!rows.length) return NextResponse.json({ error: 'файл пустой или неверный формат' }, { status: 400 })

  // ── Товары ────────────────────────────────────────────────────────────────
  if (type === 'products') {
    const categories: { id: number; name: string }[] = await sbGet('Category?select=id,name')
    const catMap = new Map(categories.map(c => [c.name.toLowerCase().trim(), c.id]))

    const toUpsert: Record<string, unknown>[] = []
    const toCreate: Record<string, unknown>[] = []
    let errors = 0

    for (const row of rows) {
      try {
        const id = num(row['ID'])
        const name = str(row['Название'])
        if (!name) continue

        const catNames = str(row['Категория']).split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
        const categoryIds = catNames.map(n => catMap.get(n)).filter((id): id is number => id !== undefined)
        if (!categoryIds.length && categories[0]) categoryIds.push(categories[0].id)
        const categoryId = categoryIds[0]

        const colorsRaw = str(row['Цвет'])
        // Поддерживаем оба варианта имени колонки (старый и новый формат файла)
        const districtsRaw = str(row['Популярность по районам (через запятую)']) || str(row['Популярность по районам'])
        const payload: Record<string, unknown> = {
          name,
          sku: str(row['SKU (meribuket)']) || null,
          slug: str(row['Слаг (URL)']) || name.toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-').slice(0, 80),
          price: num(row['Цена (₽)']),
          inStock: bool(row['В наличии']),
          isHit: bool(row['Хит']),
          isNew: bool(row['Новинка']),
          description: str(row['Описание']) || null,
          composition: str(row['Состав']) || null,
          tags: str(row['Теги']).split(',').map(t => t.trim()).filter(Boolean),
          images: str(row['Фото (через ;)']).split(';').map(s => s.trim()).filter(Boolean),
          categoryId,
          categoryIds,
          colors: colorsRaw ? colorsRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
          packaging: str(row['Упаковка']) || null,
          flowerCount: num(row['Кол-во цветов']) || null,
          width: num(row['Ширина (см)']) || null,
          height: num(row['Высота (см)']) || null,
          groupId: str(row['Группа ID']) || null,
          isAddon: bool(row['Доп. к заказу']),
          addonCategory: str(row['Категория дополнения']) || null,
          isVisible: str(row['Видна в каталоге']) ? bool(row['Видна в каталоге']) : true,
          popularInDistricts: districtsRaw ? districtsRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
        }

        if (id > 0) {
          toUpsert.push({ ...payload, id })
        } else {
          toCreate.push(payload)
        }
      } catch {
        errors++
      }
    }

    // Батчевый upsert по 200 штук одним запросом
    const BATCH = 200
    let updated = 0
    for (let i = 0; i < toUpsert.length; i += BATCH) {
      const batch = toUpsert.slice(i, i + BATCH)
      const res = await fetch(`${SB}/rest/v1/Product?on_conflict=id`, {
        method: 'POST',
        headers: { ...h, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(batch),
      })
      if (res.ok) updated += batch.length; else errors += batch.length
    }

    let created = 0
    for (const payload of toCreate) {
      const res = await sbPost('Product', payload)
      if (res.ok) created++; else errors++
    }

    return NextResponse.json({ ok: true, created, updated, errors, total: rows.length })
  }

  // ── Покупатели ────────────────────────────────────────────────────────────
  if (type === 'customers') {
    let created = 0, updated = 0, errors = 0
    for (const row of rows) {
      try {
        const id = num(row['ID'])
        const firstName = str(row['Имя'])
        const phone = str(row['Телефон'])
        if (!firstName && !phone) continue

        const holidaysRaw = str(row['Праздники (Название|ДД.ММ через ;)'])
        const holidays = holidaysRaw
          ? holidaysRaw.split(';').map(h => {
              const [name, date] = h.split('|')
              return { name: name?.trim() ?? '', date: date?.trim() ?? '' }
            }).filter(h => h.name)
          : undefined

        const payload: Record<string, unknown> = {
          firstName: firstName || '—',
          lastName: str(row['Фамилия']) || null,
          phone: phone || null,
          email: str(row['Email']) || null,
          address: str(row['Адрес']) || null,
          comment: str(row['Комментарий']) || null,
          bonuses: num(row['Бонусы']),
          points: num(row['Баллы']),
        }
        if (holidays !== undefined) payload.holidays = holidays

        if (id > 0) {
          const res = await sbPatch(`Customer?id=eq.${id}`, payload)
          if (res.ok) updated++; else errors++
        } else if (phone) {
          // Ищем по телефону
          const existing: { id: number }[] = await sbGet(`Customer?phone=eq.${encodeURIComponent(phone)}&select=id`)
          if (existing.length) {
            const res = await sbPatch(`Customer?id=eq.${existing[0].id}`, payload)
            if (res.ok) updated++; else errors++
          } else {
            const res = await sbPost('Customer', payload)
            if (res.ok) created++; else errors++
          }
        } else {
          const res = await sbPost('Customer', payload)
          if (res.ok) created++; else errors++
        }
      } catch {
        errors++
      }
    }
    return NextResponse.json({ ok: true, created, updated, errors, total: rows.length })
  }

  // ── Заказы (только обновление статуса) ───────────────────────────────────
  if (type === 'orders') {
    const STATUS_MAP: Record<string, string> = {
      'новый': 'PENDING', 'подтверждён': 'CONFIRMED', 'в работе': 'IN_PROGRESS',
      'доставлен': 'DELIVERED', 'отменён': 'CANCELLED',
    }
    let updated = 0, errors = 0
    for (const row of rows) {
      try {
        const id = num(row['ID'])
        if (!id) continue
        const statusRaw = str(row['Статус']).toLowerCase()
        const status = STATUS_MAP[statusRaw]
        if (!status) continue
        const res = await sbPatch(`Order?id=eq.${id}`, { status })
        if (res.ok) updated++; else errors++
      } catch {
        errors++
      }
    }
    return NextResponse.json({ ok: true, created: 0, updated, errors, total: rows.length })
  }

  return NextResponse.json({ error: 'unknown type' }, { status: 400 })
}
