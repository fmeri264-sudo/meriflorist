import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}` }

const DISTRICT_NAMES = [
  'Приморский район',
  'Выборгский район',
  'Калининский район',
  'Красногвардейский район',
  'Центральный район',
  'Невский район',
]

async function sb(path: string) {
  const res = await fetch(`${SB}/rest/v1/${path}`, { headers: h, cache: 'no-store' })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

function xlsx(rows: unknown[][], name: string, filename: string) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  // Ширина колонок
  ws['!cols'] = rows[0]?.map((_, i) => ({ wch: Math.min(40, Math.max(12, String(rows[1]?.[i] ?? '').length + 4)) }))
  XLSX.utils.book_append_sheet(wb, ws, name)
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params

  if (type === 'products') {
    const allCategories: { id: number; name: string }[] = await sb('Category?select=id,name')
    const catById = new Map(allCategories.map(c => [c.id, c.name]))

    const products: {
      id: number; name: string; sku: string | null; price: number; inStock: boolean
      isHit: boolean; isNew: boolean; isVisible: boolean; description: string | null; composition: string | null
      tags: string[]; images: string[]; slug: string; categoryIds: number[]
      colors: string[]; packaging: string | null; flowerCount: number | null
      width: number | null; height: number | null
      groupId: string | null; isAddon: boolean; addonCategory: string | null
      popularInDistricts: string[]
    }[] = await sb('Product?select=id,name,sku,price,inStock,isHit,isNew,isVisible,description,composition,tags,images,slug,colors,packaging,flowerCount,width,height,groupId,isAddon,addonCategory,popularInDistricts,categoryIds&order=id.asc')

    const headers = [
      'ID', 'Название', 'SKU (meribuket)', 'Слаг (URL)', 'Категория', 'Цена (₽)',
      'В наличии', 'Хит', 'Новинка', 'Видна в каталоге', 'Описание', 'Состав', 'Теги', 'Фото (через ;)',
      'Цвет', 'Упаковка', 'Кол-во цветов', 'Ширина (см)', 'Высота (см)',
      'Группа ID', 'Доп. к заказу', 'Категория дополнения',
      'Популярность по районам (через запятую)',
    ]
    const dataRows = products.map(p => [
      p.id, p.name, p.sku ?? '', p.slug,
      (p.categoryIds ?? []).map(id => catById.get(id) ?? '').filter(Boolean).join(', '),
      p.price, p.inStock ? 'да' : 'нет', p.isHit ? 'да' : 'нет', p.isNew ? 'да' : 'нет',
      (p.isVisible ?? true) ? 'да' : 'нет',
      p.description ?? '', p.composition ?? '',
      (p.tags ?? []).join(', '), (p.images ?? []).join(';'),
      (p.colors ?? []).join(', '), p.packaging ?? '', p.flowerCount ?? '',
      p.width ?? '', p.height ?? '',
      p.groupId ?? '', p.isAddon ? 'да' : 'нет', p.addonCategory ?? '',
      (p.popularInDistricts ?? []).join(', '),
    ])

    const wb = XLSX.utils.book_new()

    // Лист «Товары»
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])
    ws['!cols'] = headers.map((h, i) => ({ wch: Math.min(40, Math.max(12, String(dataRows[0]?.[i] ?? h).length + 4)) }))

    // Заморозить первую строку (заголовок)
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }

    // Выпадающие списки да/нет для колонок 6,7,8,19 (0-based: G,H,I,T)
    const daNyet = '"да,нет"'
    const rowCount = dataRows.length + 1
    const dvCols = [
      { col: 6,  letter: 'G' },  // В наличии
      { col: 7,  letter: 'H' },  // Хит
      { col: 8,  letter: 'I' },  // Новинка
      { col: 9,  letter: 'J' },  // Видна в каталоге
      { col: 20, letter: 'U' },  // Доп. к заказу
    ]
    if (!ws['!dataValidation']) ws['!dataValidation'] = []
    for (const { letter } of dvCols) {
      ;(ws['!dataValidation'] as unknown[]).push({
        sqref: `${letter}2:${letter}${rowCount}`,
        type: 'list',
        formula1: daNyet,
        showDropDown: false,
      })
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Товары')

    // Лист «Справочник» — для копипасты районов
    const refRows: string[][] = [
      ['Импорт товаров: заполненный ID обновляет только существующий товар.'],
      ['Для нового товара оставьте ID пустым — номер назначит база данных.'],
      [''],
      ['Районы (для колонки "Популярность по районам")'],
      ...DISTRICT_NAMES.map(d => [d]),
      [''],
      ['Для одного товара можно указать несколько районов через запятую:'],
      ['Пример: Приморский район, Выборгский район'],
    ]
    const wsRef = XLSX.utils.aoa_to_sheet(refRows)
    wsRef['!cols'] = [{ wch: 50 }]
    XLSX.utils.book_append_sheet(wb, wsRef, 'Справочник')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="products.xlsx"',
      },
    })
  }

  if (type === 'customers') {
    const customers: {
      id: number; firstName: string; lastName: string | null; phone: string | null
      email: string | null; address: string | null; comment: string | null
      bonuses: number; points: number; holidays: { name: string; date: string }[]; createdAt: string
    }[] = await sb('Customer?select=*&order=id.asc')

    const headers = ['ID', 'Имя', 'Фамилия', 'Телефон', 'Email', 'Адрес',
      'Бонусы', 'Баллы', 'Комментарий', 'Дата регистрации',
      'Праздники (Название|ДД.ММ через ;)']
    const rows = customers.map(c => [
      c.id, c.firstName, c.lastName ?? '', c.phone ?? '', c.email ?? '',
      c.address ?? '', c.bonuses, c.points, c.comment ?? '',
      c.createdAt ? new Date(c.createdAt).toLocaleDateString('ru') : '',
      (c.holidays ?? []).map((h: { name: string; date: string }) => `${h.name}|${h.date}`).join(';'),
    ])
    return xlsx([headers, ...rows], 'Покупатели', 'customers.xlsx')
  }

  if (type === 'orders') {
    const orders: {
      id: number; number: string; createdAt: string; status: string; paymentStatus: string
      recipientName: string; recipientPhone: string; address: string | null
      deliveryDate: string | null; deliveryTime: string | null; selfPickup: boolean
      totalAmount: number; deliveryCost: number; subtotal: number; paymentMethod: string
      comment: string | null; cardText: string | null; photoReport: boolean
      items: { quantity: number; price: number; product: { name: string } | null }[]
    }[] = await sb('Order?select=*,items:OrderItem(quantity,price,product:Product(name))&order=createdAt.desc&limit=5000')

    const headers = ['ID', 'Номер', 'Дата создания', 'Статус', 'Статус оплаты',
      'Способ оплаты', 'Получатель', 'Телефон', 'Адрес', 'Самовывоз',
      'Дата доставки', 'Время доставки', 'Сумма товаров', 'Доставка', 'Итого',
      'Товары (название x кол-во через ;)', 'Подпись на открытке', 'Фотоотчёт', 'Комментарий']

    const STATUS: Record<string, string> = {
      PENDING: 'Новый', CONFIRMED: 'Собран', IN_PROGRESS: 'Доставляется',
      DELIVERED: 'Доставлен', CANCELLED: 'Отменён',
    }
    const PAY: Record<string, string> = { ONLINE: 'Онлайн', CASH: 'Наличные', SBP: 'СБП', PENDING: 'Ожидает' }

    const rows = orders.map(o => [
      o.id, o.number,
      o.createdAt ? new Date(o.createdAt).toLocaleString('ru') : '',
      STATUS[o.status] ?? o.status,
      PAY[o.paymentStatus] ?? o.paymentStatus,
      PAY[o.paymentMethod] ?? o.paymentMethod,
      o.recipientName, o.recipientPhone, o.address ?? '',
      o.selfPickup ? 'да' : 'нет',
      o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString('ru') : '',
      o.deliveryTime ?? '',
      o.subtotal, o.deliveryCost, o.totalAmount,
      (o.items ?? []).map(i => `${i.product?.name ?? '?'} x${i.quantity}`).join(';'),
      o.cardText ?? '', o.photoReport ? 'да' : 'нет', o.comment ?? '',
    ])
    return xlsx([headers, ...rows], 'Заказы', 'orders.xlsx')
  }

  return NextResponse.json({ error: 'unknown type' }, { status: 400 })
}
