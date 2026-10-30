'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Eye, EyeOff, Star, RefreshCw } from 'lucide-react'

interface Review {
  id: number; author: string; text: string; rating: number
  source: string; productName: string | null; visible: boolean; createdAt: string
}

const SOURCES = [
  { value: 'direct', label: 'Напрямую' },
  { value: 'ym', label: 'Яндекс Маркет' },
  { value: 'ozon', label: 'Ozon' },
  { value: 'wb', label: 'Wildberries' },
  { value: 'google', label: 'Google' },
]

const empty = { author: '', text: '', rating: 5, source: 'direct', productName: '' }

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [form, setForm] = useState(empty)
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [publishing, setPublishing] = useState<number | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/reviews')
    setReviews(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggle(r: Review) {
    setPublishing(r.id)
    try {
      const res = await fetch(`/api/admin/reviews/${r.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible: !r.visible }),
      })
      const saved = await res.json()
      if (!res.ok || saved.visible !== !r.visible) throw new Error(saved.error || 'Не удалось изменить публикацию отзыва')
      setReviews(current => current.map(review => review.id === r.id ? saved : review))
      setSyncResult(saved.visible ? 'Отзыв опубликован на сайте' : 'Отзыв скрыт с сайта')
    } catch (e) {
      setSyncResult(`Ошибка публикации: ${e instanceof Error ? e.message : 'Нет соединения с сайтом'}`)
    } finally {
      setPublishing(null)
    }
  }

  async function remove(id: number) {
    if (!confirm('Удалить отзыв?')) return
    await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })
    load()
  }

  async function sync(source: string) {
    setSyncing(source)
    setSyncResult(null)
    try {
      const res = await fetch('/api/admin/reviews/sync', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      })
      const data = await res.json()
      const total = Object.values(data).reduce((s: number, r: unknown) =>
        s + ((r as { added?: number })?.added ?? 0), 0)
      const errors = Object.entries(data)
        .filter(([, v]) => (v as { error?: string })?.error)
        .map(([k, v]) => `${k}: ${(v as { error: string }).error}`)
      setSyncResult(total > 0
        ? `Загружено ${total} новых отзывов. ${errors.length ? 'Ошибки: ' + errors.join('; ') : ''}`
        : errors.length ? `Ошибки: ${errors.join('; ')}` : 'Новых отзывов не найдено')
      load()
    } catch (e) {
      setSyncResult('Ошибка синхронизации')
    }
    setSyncing(null)
  }

  async function add() {
    if (!form.author || !form.text) return
    await fetch('/api/admin/reviews', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, productName: form.productName || null }),
    })
    setForm(empty)
    setAdding(false)
    load()
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Отзывы</h1>
          <p className="text-sm text-gray-500 mt-0.5">Отображаются на главной странице</p>
        </div>
        <button onClick={() => setAdding(!adding)}
          className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          <Plus size={16}/> Добавить отзыв
        </button>
      </div>

      {/* Sync panel */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Загрузить положительные отзывы (4–5 ★)</p>
        <div className="flex flex-wrap gap-2">
          {[
            { source: 'ym', label: 'Яндекс Маркет' },
            { source: 'ozon', label: 'Ozon' },
            { source: 'wb', label: 'Wildberries' },
            { source: 'all', label: 'Все площадки' },
          ].map(({ source, label }) => (
            <button key={source} onClick={() => sync(source)}
              disabled={!!syncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition ${
                source === 'all'
                  ? 'bg-pink-500 text-white border-pink-500 hover:bg-pink-600'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              } disabled:opacity-50`}>
              <RefreshCw size={13} className={syncing === source ? 'animate-spin' : ''} />
              {syncing === source ? 'Загрузка...' : label}
            </button>
          ))}
        </div>
        {syncResult && (
          <p className={`text-xs mt-2 ${syncResult.includes('Ошибк') ? 'text-red-500' : 'text-green-600'}`}>
            {syncResult}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-2">Новые отзывы добавляются скрытыми — включите глазком те, что хотите показать на сайте</p>
      </div>

      {adding && (
        <div className="bg-white rounded-xl border border-pink-100 p-5 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Имя автора *</label>
              <input value={form.author} onChange={e => setForm({...form, author: e.target.value})}
                className={inp} placeholder="Анна М." />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Источник</label>
              <select value={form.source} onChange={e => setForm({...form, source: e.target.value})} className={inp}>
                {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Оценка</label>
              <div className="flex gap-1 mt-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setForm({...form, rating: n})}>
                    <Star size={20} className={n <= form.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Название букета (необязательно)</label>
              <input value={form.productName} onChange={e => setForm({...form, productName: e.target.value})}
                className={inp} placeholder="Букет из роз..." />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Текст отзыва *</label>
            <textarea value={form.text} onChange={e => setForm({...form, text: e.target.value})}
              className={inp + ' resize-none'} rows={3} placeholder="Отличный букет, всё понравилось..." />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">Отмена</button>
            <button onClick={add} className="px-4 py-2 text-sm bg-pink-500 text-white rounded-lg hover:bg-pink-600">Сохранить</button>
          </div>
        </div>
      )}

      {loading ? <div className="text-gray-400">Загрузка...</div> : (
        <div className="space-y-2">
          {reviews.map(r => (
            <div key={r.id} className={`bg-white rounded-xl border border-gray-100 px-4 py-3 ${!r.visible ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">{r.author}</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(n => <Star key={n} size={12} className={n <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />)}
                    </div>
                    <span className="text-xs text-gray-400">{SOURCES.find(s => s.value === r.source)?.label}</span>
                    {r.productName && <span className="text-xs text-pink-400">«{r.productName}»</span>}
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{r.text}</p>
                </div>
                <button onClick={() => toggle(r)} disabled={publishing !== null} title={r.visible ? 'Скрыть отзыв' : 'Опубликовать отзыв'} aria-label={r.visible ? 'Скрыть отзыв' : 'Опубликовать отзыв'} className={`p-1.5 rounded-lg disabled:opacity-50 ${r.visible ? 'text-green-500 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-50'}`}>
                  {r.visible ? <Eye size={15}/> : <EyeOff size={15}/>}
                </button>
                <button onClick={() => remove(r.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15}/></button>
              </div>
            </div>
          ))}
          {reviews.length === 0 && <p className="text-center text-gray-400 py-8">Отзывов пока нет</p>}
        </div>
      )}
    </div>
  )
}

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400'
