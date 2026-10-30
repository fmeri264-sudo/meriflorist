import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Возврат и обмен — Meri Florist',
}

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!

async function getContent(): Promise<string> {
  const res = await fetch(`${SB}/rest/v1/LegalPage?slug=eq.vozvrat&select=content&limit=1`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    cache: 'no-store',
  })
  if (!res.ok) return ''
  const rows = await res.json()
  return rows[0]?.content ?? ''
}

export default async function VozvratPage() {
  const content = await getContent()
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Возврат и обмен</h1>
      {content ? (
        <div className="text-gray-700 leading-relaxed whitespace-pre-line">{content}</div>
      ) : (
        <p className="text-gray-400">Страница в разработке.</p>
      )}
    </div>
  )
}
