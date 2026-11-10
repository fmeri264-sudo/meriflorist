const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}` }

export interface SiteSettings {
  heroImageUrl: string
  heroMobileImageUrl: string
  heroImagePosition: string
  heroTitle: string
  heroDescription: string
  heroButtonText: string
  heroButtonUrl: string
  homeSelectionTitle: string
  homeSelectionConfig: string
  homeSeasonalImageUrl: string
  homeSeasonalTitle: string
  homeSeasonalLink: string
  homeAboutText: string
  homeAboutImageUrl: string
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
  heroImageUrl: '',
  heroMobileImageUrl: '',
  heroImagePosition: '50% 50%',
  heroTitle: 'Маленькое чудо — в ваших руках',
  heroDescription: 'Букеты, собранные с вниманием к вашим чувствам. Поможем выбрать и покажем фото перед отправкой.',
  heroButtonText: 'Выбрать букет',
  heroButtonUrl: '/catalog',
  homeSelectionTitle: 'Выбор Мэри',
  homeSelectionConfig: '',
  homeSeasonalImageUrl: '',
  homeSeasonalTitle: 'Сезонное настроение',
  homeSeasonalLink: '/catalog',
  homeAboutText: 'За каждым букетом — внимание к вашим чувствам. Поможем выбрать цветы, подобрать оттенки и найти слова для открытки. Мэри — ваш личный флорист в Петербурге.',
  homeAboutImageUrl: '',
  siteName: 'МЭРИ',
  logoUrl: '/brand/mary-horizontal.png',
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
