'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Edit2, Trash2, Eye, EyeOff, Globe, ExternalLink } from 'lucide-react'

interface PageRow {
  id: number
  slug: string
  title: string
  metaTitle?: string
  published: boolean
  showInHeader: boolean
  showInFooter: boolean
  headerLabel?: string
  customPath?: string
  category?: string | null
  createdAt: string
}

export const CATEGORIES: Record<string, { label: string; color: string }> = {
  events: { label: 'События и акции', color: 'bg-orange-100 text-orange-700' },
  news:   { label: 'Новости',         color: 'bg-blue-100 text-blue-700' },
  tips:   { label: 'Советы',          color: 'bg-teal-100 text-teal-700' },
}

const SQL_HINT = `-- Выполните в Supabase SQL Editor:
create table "Page" (
  id serial primary key,
  slug text unique not null,
  title text not null default '',
  "metaTitle" text,
  "metaDescription" text,
  published boolean default false,
  "showInHeader" boolean default false,
  "showInFooter" boolean default false,
  "headerLabel" text,
  category text,
  blocks jsonb default '[]'::jsonb,
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);`

const ADD_COLUMN_HINT = `ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS category text;`

export default function AdminPagesPage() {
  const [pages, setPages] = useState<PageRow[]>([])
  const [tableExists, setTableExists] = useState(true)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newCategory, setNewCategory] = useState<string>('')
  const [createError, setCreateError] = useState('')
  const [deleting, setDeleting] = useState<number | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/pages')
    const data = await res.json()
    setTableExists(data.tableExists !== false)
    setPages(data.pages ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function slugify(str: string) {
    return str.toLowerCase()
      .replace(/[а-яё]/g, c => ({ а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' }[c] ?? c))
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  function handleTitleChange(val: string) {
    setNewTitle(val)
    setNewSlug(slugify(val))
    setCreateError('')
  }

  async function createPage() {
    if (!newTitle.trim() || !newSlug.trim()) return
    setCreating(true)
    setCreateError('')
    const res = await fetch('/api/admin/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle.trim(),
        slug: newSlug.trim(),
        category: newCategory || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setCreateError(data.error ?? 'Ошибка создания')
      setCreating(false)
      return
    }
    window.location.href = `/admin/pages/${data.id}/edit`
  }

  async function deletePage(id: number) {
    if (!confirm('Удалить страницу? Это действие нельзя отменить.')) return
    setDeleting(id)
    await fetch(`/api/admin/pages/${id}`, { method: 'DELETE' })
    setPages(p => p.filter(x => x.id !== id))
    setDeleting(null)
  }

  async function togglePublished(page: PageRow) {
    const res = await fetch(`/api/admin/pages/${page.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !page.published }),
    })
    if (res.ok) setPages(p => p.map(x => x.id === page.id ? { ...x, published: !x.published } : x))
  }

  if (!tableExists) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Страницы</h1>
        <p className="text-gray-500 mb-6">Таблица страниц ещё не создана в базе данных.</p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">Создайте таблицу в Supabase SQL Editor:</p>
          <pre className="text-xs bg-white border border-amber-200 rounded-lg p-3 overflow-x-auto text-gray-700 whitespace-pre-wrap">{SQL_HINT}</pre>
        </div>
        <button onClick={load} className="text-sm text-pink-500 hover:underline">Проверить снова</button>
      </div>
    )
  }

  const filtered = filterCategory === 'all'
    ? pages
    : filterCategory === 'none'
      ? pages.filter(p => !p.category)
      : pages.filter(p => p.category === filterCategory)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Страницы</h1>
          <p className="text-gray-500 text-sm mt-0.5">Конструктор страниц сайта</p>
        </div>
      </div>

      {/* Форма создания */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Plus size={16} className="text-pink-500" /> Новая страница
        </p>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <input
              value={newTitle}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="Название страницы"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <span className="text-xs text-gray-400 px-2 border-r border-gray-200 bg-gray-50 py-2">/pages/</span>
              <input
                value={newSlug}
                onChange={e => { setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')); setCreateError('') }}
                placeholder="url-slug"
                className="flex-1 px-3 py-2 text-sm focus:outline-none"
              />
            </div>
          </div>
          <div className="min-w-[180px]">
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
            >
              <option value="">— Без категории —</option>
              {Object.entries(CATEGORIES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={createPage}
            disabled={creating || !newTitle.trim()}
            className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 whitespace-nowrap"
          >
            {creating ? 'Создание...' : 'Создать и редактировать'}
          </button>
        </div>
        {createError && <p className="text-xs text-red-500 mt-2">{createError}</p>}
      </div>

      {/* Фильтр по категориям */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: 'all', label: 'Все' },
          ...Object.entries(CATEGORIES).map(([key, { label }]) => ({ key, label })),
          { key: 'none', label: 'Без категории' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterCategory(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filterCategory === tab.key
                ? 'bg-pink-500 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-pink-300'
            }`}
          >
            {tab.label}
            {tab.key === 'all' && <span className="ml-1.5 text-xs opacity-70">{pages.length}</span>}
          </button>
        ))}
      </div>

      {/* Список страниц */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {filterCategory === 'all' ? 'Страниц ещё нет. Создайте первую!' : 'Нет страниц в этой категории.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(page => {
            const cat = page.category ? CATEGORIES[page.category] : null
            return (
              <div key={page.id} className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{page.title}</span>
                    {page.published ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">Опубликована</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 font-medium">Черновик</span>
                    )}
                    {cat && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.color}`}>{cat.label}</span>
                    )}
                    {page.showInHeader && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-600 font-medium">Шапка</span>
                    )}
                    {page.showInFooter && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-600 font-medium">Подвал</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Globe size={11} />
                    {page.customPath ? `/${page.customPath}` : `/pages/${page.slug}`}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {page.published && (
                    <a
                      href={page.customPath ? `/${page.customPath}` : `/pages/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition"
                      title="Открыть страницу"
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                  <button
                    onClick={() => togglePublished(page)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition"
                    title={page.published ? 'Снять с публикации' : 'Опубликовать'}
                  >
                    {page.published ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <Link
                    href={`/admin/pages/${page.id}/edit`}
                    className="flex items-center gap-1.5 bg-pink-50 text-pink-600 hover:bg-pink-100 px-3 py-1.5 rounded-lg text-sm font-medium transition"
                  >
                    <Edit2 size={13} /> Редактировать
                  </Link>
                  <button
                    onClick={() => deletePage(page.id)}
                    disabled={deleting === page.id}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                    title="Удалить"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Подсказка для добавления колонки */}
      <div className="mt-6 bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-700">
        <p className="font-semibold mb-1">Если категории не сохраняются — выполните в Supabase SQL Editor:</p>
        <pre className="bg-white border border-amber-200 rounded p-2 font-mono">{ADD_COLUMN_HINT}</pre>
      </div>
    </div>
  )
}
