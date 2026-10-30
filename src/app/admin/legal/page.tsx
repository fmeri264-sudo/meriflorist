'use client'

import { useEffect, useState, useCallback } from 'react'
import { Check, ExternalLink } from 'lucide-react'

interface LegalPage {
  slug: string
  title: string
  content: string
}

const SLUGS = [
  { slug: 'rules',   title: 'Правила сайта',                 href: '/rules' },
  { slug: 'privacy', title: 'Политика конфиденциальности',    href: '/privacy' },
  { slug: 'oferta',  title: 'Оферта сайта',                  href: '/oferta' },
  { slug: 'consent', title: 'Согласие на обработку данных',   href: '/consent' },
  { slug: 'vozvrat', title: 'Возврат и обмен',                href: '/vozvrat' },
]

export default function AdminLegalPage() {
  const [pages, setPages] = useState<LegalPage[]>([])
  const [active, setActive] = useState('rules')
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/legal')
    const data: LegalPage[] = await res.json()
    setPages(data)
    const cur = data.find(p => p.slug === active)
    setDraft(cur?.content ?? '')
  }, [active])

  useEffect(() => { load() }, [load])

  function selectPage(slug: string) {
    setActive(slug)
    setSaved(false)
    const cur = pages.find(p => p.slug === slug)
    setDraft(cur?.content ?? '')
  }

  async function save() {
    setSaving(true)
    await fetch('/api/admin/legal', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: active, content: draft }),
    })
    setPages(prev => prev.map(p => p.slug === active ? { ...p, content: draft } : p))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const activePage = SLUGS.find(s => s.slug === active)!

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Правовые страницы</h1>
        <div className="flex items-center gap-3">
          <a
            href={activePage.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition"
          >
            <ExternalLink size={14} /> Посмотреть на сайте
          </a>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            {saved ? <><Check size={15} /> Сохранено</> : saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Список страниц */}
        <div className="w-56 flex-shrink-0 space-y-1">
          {SLUGS.map(s => (
            <button
              key={s.slug}
              onClick={() => selectPage(s.slug)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition ${
                active === s.slug
                  ? 'bg-pink-50 text-pink-600 border border-pink-100'
                  : 'text-gray-600 hover:bg-gray-50 border border-transparent'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* Редактор */}
        <div className="flex-1 flex flex-col">
          <p className="text-xs text-gray-400 mb-2">
            Вставьте текст страницы. Пустые строки между абзацами сохраняются.
          </p>
          <textarea
            value={draft}
            onChange={e => { setDraft(e.target.value); setSaved(false) }}
            className="flex-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-pink-300 font-mono"
            placeholder={`Текст страницы «${activePage.title}»...`}
          />
        </div>
      </div>
    </div>
  )
}
