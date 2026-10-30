const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}` }

export interface SiteSettings {
  siteName: string
  logoUrl: string
  phone: string
  whatsapp: string
  telegram: string
  vk: string
  max: string
  pageDelivery: string
  pageContacts: string
  footerEmail: string
  footerLegal: string
}

export const SETTING_DEFAULTS: SiteSettings = {
  siteName: 'Meri Florist',
  logoUrl: '',
  phone: '+7 (800) 123-45-67',
  whatsapp: 'https://wa.me/78001234567',
  telegram: '',
  vk: '',
  max: '',
  pageDelivery: '',
  pageContacts: '',
  footerEmail: '',
  footerLegal: '',
}

export async function getSettings(): Promise<SiteSettings> {
  try {
    const res = await fetch(`${SB}/rest/v1/SiteSettings?select=key,value`, {
      headers: h,
      cache: 'no-store',
    })
    if (!res.ok) return SETTING_DEFAULTS
    const rows: { key: string; value: string }[] = await res.json()
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
    return { ...SETTING_DEFAULTS, ...map } as SiteSettings
  } catch {
    return SETTING_DEFAULTS
  }
}
