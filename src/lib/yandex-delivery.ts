// Yandex Delivery B2B Cargo API
const API_TOKEN = process.env.YANDEX_DELIVERY_TOKEN!
const CLIENT_ID = process.env.YANDEX_DELIVERY_CLIENT_ID!
const BASE_URL = 'https://b2b.taxi.yandex.net/b2b/cargo/integration/v2'

const WAREHOUSE_COORDS = {
  lat: parseFloat(process.env.WAREHOUSE_LAT ?? '60.0043'),
  lon: parseFloat(process.env.WAREHOUSE_LON ?? '30.2548'),
}

function ydHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_TOKEN}`,
    'X-Corp-Client-Id': CLIENT_ID,
    'Accept-Language': 'ru',
  }
}

const STREET_ABBR: [RegExp, string][] = [
  [/\bпр-т\.?\s*/gi,    'проспект '],
  [/\bпросп?\.\s*/gi,   'проспект '],
  [/\bпр\.\s*/gi,       'проспект '],
  [/\bпр\b\s*/gi,       'проспект '],   // "Пр " без точки
  [/\bул\.\s*/gi,       'улица '],
  [/\bул\b\s*/gi,       'улица '],
  [/\bпер\.\s*/gi,      'переулок '],
  [/\bпер\b\s*/gi,      'переулок '],
  [/\bб-р\.?\s*/gi,     'бульвар '],
  [/\bбул\.\s*/gi,      'бульвар '],
  [/\bш\.\s*/gi,        'шоссе '],
  [/\bнаб\.\s*/gi,      'набережная '],
  [/\bпл\.\s*/gi,       'площадь '],
  [/\bпр-д\.?\s*/gi,    'проезд '],
  [/\bтуп\.\s*/gi,      'тупик '],
  [/\bпос\.\s*/gi,      'посёлок '],
  [/\bл-т\.?\s*/gi,     'линия '],
]

function expandAbbr(address: string): string {
  let s = address.trim()
  for (const [re, full] of STREET_ABBR) s = s.replace(re, full)
  return s.replace(/\s{2,}/g, ' ').trim()
}

// Яндекс Геокодер — первичный геокодер
async function geocodeYandex(address: string): Promise<{ lat: number; lon: number } | null> {
  const token = process.env.YANDEX_GEOCODER_TOKEN
  if (!token || token === 'your_geocoder_token') return null
  try {
    const query = `Санкт-Петербург, ${address}`
    const url = `https://geocode-maps.yandex.ru/1.x/?format=json&apikey=${token}&geocode=${encodeURIComponent(query)}&results=1&lang=ru_RU&rspn=1&bbox=29.4,59.6~31.0,60.3`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    const pos = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos
    if (!pos) return null
    const [lon, lat] = pos.split(' ').map(Number)
    if (!lat || !lon) return null
    return { lat, lon }
  } catch {
    return null
  }
}

// Nominatim (OpenStreetMap) — резервный геокодер
async function nominatimQuery(q: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=ru`,
      { headers: { 'User-Agent': 'MeriFlorist/1.0 (meriflorist.ru)' } }
    )
    const data = await res.json()
    if (!data?.[0]) return null
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

async function geocode(address: string): Promise<{ lat: number; lon: number } | null> {
  const expanded = expandAbbr(address)

  // Попытка 1: Яндекс Геокодер (полный адрес)
  const yd = await geocodeYandex(expanded)
  if (yd) return yd

  // Попытка 2: Nominatim (полный адрес)
  const full = await nominatimQuery(`Санкт-Петербург, ${expanded}`)
  if (full) return full

  // Попытка 3: Nominatim (только улица, без номера дома)
  const streetOnly = expanded.replace(/,?\s*д?\.?\s*\d+.*$/, '').trim()
  if (streetOnly && streetOnly !== expanded) {
    const byStreet = await nominatimQuery(`Санкт-Петербург, ${streetOnly}`)
    if (byStreet) return byStreet
  }

  // Попытка 4: Яндекс Геокодер (только улица)
  if (streetOnly && streetOnly !== expanded) {
    return geocodeYandex(streetOnly)
  }

  return null
}

// ── Расстояние по формуле Хаверсина (км) ────────────────────────────────────
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Базовая тарификация: 300 ₽ первые 5 км, далее 40 ₽/км, округление до 50
function priceByDistance(km: number): number {
  const base = 300
  const extra = Math.max(0, km - 5) * 40
  return Math.ceil((base + extra) / 50) * 50
}

// ── Расчёт стоимости доставки ─────────────────────────────────────────────────
export interface DeliveryPrice {
  price: number
  currency: string
}

export async function calculateDeliveryCost(addressStr: string): Promise<DeliveryPrice | null> {
  // Геокодируем адрес получателя
  const coords = await geocode(addressStr)
  if (!coords) return null

  // 1. Пробуем получить цену через Яндекс Доставку check-price
  try {
    const body = {
      items: [{ size: { height: 0.5, length: 0.5, width: 0.3 }, weight: 2, quantity: 1 }],
      route_points: [
        { coordinates: [WAREHOUSE_COORDS.lon, WAREHOUSE_COORDS.lat] },
        { coordinates: [coords.lon, coords.lat] },
      ],
    }

    const res = await fetch(`${BASE_URL}/check-price`, {
      method: 'POST',
      headers: ydHeaders(),
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const data = await res.json()
      // Ответ может быть { price: "350" } или { offers: [{ price: "350" }] }
      const raw = data?.price ?? data?.offers?.[0]?.price
      const price = raw ? Math.ceil(parseFloat(String(raw))) : null
      if (price && price > 0) return { price, currency: 'RUB' }
    }
  } catch {
    // YD check-price недоступен — используем расчёт по расстоянию
  }

  // 2. Запасной вариант: расчёт по расстоянию между магазином и адресом доставки
  const km = distanceKm(WAREHOUSE_COORDS.lat, WAREHOUSE_COORDS.lon, coords.lat, coords.lon)
  const price = priceByDistance(km)
  return { price, currency: 'RUB' }
}

// ── Создание заявки на курьера ────────────────────────────────────────────────
export interface DeliveryClaimResult {
  claimId: string
  status: string
  error?: string
}

// Парсит "10:00 – 12:00" + "2026-05-24" → { from: ISO, to: ISO }
function parseDeliveryInterval(date: string, timeSlot: string): { from: string; to: string } | null {
  try {
    const parts = timeSlot.split(/[–—-]/).map(s => s.trim())
    if (parts.length < 2) return null
    const [fromH, fromM] = parts[0].split(':').map(Number)
    const [toH, toM] = parts[1].split(':').map(Number)
    const from = new Date(`${date}T${String(fromH).padStart(2, '0')}:${String(fromM ?? 0).padStart(2, '0')}:00+03:00`)
    const to   = new Date(`${date}T${String(toH).padStart(2, '0')}:${String(toM ?? 0).padStart(2, '0')}:00+03:00`)
    return { from: from.toISOString(), to: to.toISOString() }
  } catch {
    return null
  }
}

export async function createDeliveryClaim(params: {
  address: string
  recipientName: string
  recipientPhone: string
  amount: number
  orderNumber: string
  courierNote?: string
  deliveryDate?: string   // YYYY-MM-DD
  deliveryTime?: string   // "10:00 – 12:00"
}): Promise<DeliveryClaimResult> {
  try {
    const coords = await geocode(params.address)
    if (!coords) {
      return { claimId: '', status: 'error', error: 'Не удалось определить координаты адреса' }
    }

    const requestId = crypto.randomUUID()

    const interval = (params.deliveryDate && params.deliveryTime)
      ? parseDeliveryInterval(params.deliveryDate, params.deliveryTime)
      : null

    const body = {
      items: [
        {
          size: { height: 0.5, length: 0.5, width: 0.3 },
          weight: 2.0,
          quantity: 1,
          cost_value: String(params.amount),
          cost_currency: 'RUB',
          droppof_point: 1,
          pickup_point: 0,
          title: `Заказ ${params.orderNumber}`,
        },
      ],
      route_points: [
        {
          point_id: 0,
          visit_order: 1,
          type: 'source',
          address: {
            fullname: process.env.WAREHOUSE_ADDRESS ?? 'Санкт-Петербург, пр. Испытателей, 33',
            coords: { lat: WAREHOUSE_COORDS.lat, lon: WAREHOUSE_COORDS.lon },
          },
          contact: {
            name: 'Meri Florist',
            phone: process.env.WAREHOUSE_PHONE ?? '+79319912839',
          },
          comment: process.env.WAREHOUSE_COMMENT,
          skip_confirmation: true,
        },
        {
          point_id: 1,
          visit_order: 2,
          type: 'destination',
          address: {
            fullname: `Санкт-Петербург, ${params.address}`,
            coords: { lat: coords.lat, lon: coords.lon },
          },
          contact: {
            name: params.recipientName,
            phone: params.recipientPhone,
          },
          ...(params.courierNote ? { comment: params.courierNote } : {}),
          ...(interval ? { interval } : {}),
        },
      ],
      client_requirements: { taxi_class: 'express' },
    }

    const createRes = await fetch(`${BASE_URL}/claims/create?request_id=${requestId}`, {
      method: 'POST',
      headers: ydHeaders(),
      body: JSON.stringify(body),
    })

    if (!createRes.ok) {
      const err = await createRes.text()
      return { claimId: '', status: 'error', error: `YD ${createRes.status}: ${err}` }
    }

    const claim = await createRes.json()
    const claimId: string = claim.id
    const claimStatus: string = claim.status ?? 'new'

    // Принимаем заявку
    const acceptRes = await fetch(`${BASE_URL}/claims/accept?claim_id=${claimId}`, {
      method: 'POST',
      headers: ydHeaders(),
      body: JSON.stringify({ version: claim.version ?? 1 }),
    })

    if (acceptRes.ok) {
      const accepted = await acceptRes.json()
      return { claimId, status: accepted.status ?? 'accepted' }
    }

    return { claimId, status: claimStatus }
  } catch (e) {
    return { claimId: '', status: 'error', error: String(e) }
  }
}

// ── Статус заявки ──────────────────────────────────────────────────────────────
export interface DeliveryClaimInfo {
  status: string
  statusLabel: string
  error?: string
}

const YD_STATUS_LABELS: Record<string, string> = {
  new: 'Новая',
  estimating: 'Расчёт цены',
  estimating_failed: 'Ошибка расчёта',
  ready_for_approval: 'Ожидает подтверждения',
  accepted: 'Принята',
  performer_lookup: 'Поиск курьера',
  performer_draft: 'Назначение курьера',
  performer_found: 'Курьер найден',
  performer_not_found: 'Курьер не найден',
  pickup_arrived: 'Курьер на месте',
  ready_for_pickup_confirmation: 'Ожидание передачи',
  pickuped: 'Забрал заказ',
  delivery_arrived: 'У получателя',
  pay_waiting: 'Ожидание оплаты',
  delivered: 'Доставлен',
  delivered_finish: 'Завершено',
  returning: 'Возврат',
  return_arrived: 'Возврат прибыл',
  returned_finish: 'Возвращён',
  cancelled: 'Отменена',
  cancelled_with_payment: 'Отменена (платно)',
  failed: 'Ошибка',
}

export async function getDeliveryClaimInfo(claimId: string): Promise<DeliveryClaimInfo> {
  try {
    const res = await fetch(`${BASE_URL}/claims/info?claim_id=${claimId}`, {
      headers: ydHeaders(),
    })
    if (!res.ok) {
      return { status: 'unknown', statusLabel: 'Неизвестно', error: `YD ${res.status}` }
    }
    const data = await res.json()
    const status: string = data.status ?? 'unknown'
    return { status, statusLabel: YD_STATUS_LABELS[status] ?? status }
  } catch (e) {
    return { status: 'error', statusLabel: 'Ошибка', error: String(e) }
  }
}

export const SELF_PICKUP_COST = 0
