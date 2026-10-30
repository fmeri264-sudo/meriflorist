import type { NextRequest } from 'next/server'
import { getAdminToken } from './admin-auth'
import { CheckoutError, normalizePromoCode, type PromoCode } from './promocodes'

export async function requirePromoAdmin(req: NextRequest) {
  if (!process.env.ADMIN_PASSWORD || req.cookies.get('admin_session')?.value !== await getAdminToken()) {
    throw new CheckoutError('Требуется вход администратора', 401)
  }
  const origin = req.headers.get('origin')
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin : req.nextUrl.origin
  if (req.method !== 'GET' && origin && ![req.nextUrl.origin, siteOrigin].includes(origin)) {
    throw new CheckoutError('Недопустимый источник запроса', 403)
  }
}
export async function promoRequest(query = '', init?: RequestInit): Promise<Response> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.SUPABASE_URL
  if (!key || !url) throw new CheckoutError('Промокоды временно недоступны. Обратитесь в магазин.', 503)
  const res = await fetch(`${url}/rest/v1/PromoCode${query}`, {
    ...init, cache: 'no-store',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
      Prefer: 'return=representation', ...init?.headers },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    if (data.code === '23505') throw new CheckoutError('Такой промокод уже существует', 409)
    console.error('[promocodes database]', res.status, data.code ?? '')
    throw new CheckoutError('Не удалось загрузить или сохранить промокод. Проверьте настройки базы.', 503)
  }
  return res
}
export async function findPromoCode(value: unknown): Promise<PromoCode> {
  const code = normalizePromoCode(value)
  const res = await promoRequest(`?code=eq.${encodeURIComponent(code)}&isActive=eq.true&limit=1`)
  const rows: PromoCode[] = await res.json()
  if (!rows.length) throw new CheckoutError('Промокод не найден или отключён')
  return rows[0]
}
export function promoError(error: unknown): Response {
  if (error instanceof CheckoutError) return Response.json({ error: error.message }, { status: error.status })
  if (error instanceof SyntaxError) return Response.json({ error: 'Некорректный запрос' }, { status: 400 })
  console.error('[promocodes]', error)
  return Response.json({ error: 'Не удалось выполнить запрос. Попробуйте ещё раз.' }, { status: 500 })
}
