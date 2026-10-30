'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import type { PromoCode } from '@/lib/promocodes'

const empty = { code: '', name: '', discountType: 'percent' as PromoCode['discountType'], discountValue: '10', isActive: true }
const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300'
async function readResponse(res: Response) {
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Не удалось выполнить запрос')
  return data
}

export default function PromoCodesPanel() {
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setCodes(await readResponse(await fetch('/api/admin/promocodes', { cache: 'no-store' })))
      setError('')
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось загрузить промокоды') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => {
    let current = true
    fetch('/api/admin/promocodes', { cache: 'no-store' }).then(readResponse)
      .then(data => { if (current) setCodes(data) })
      .catch(e => { if (current) setError(e instanceof Error ? e.message : 'Не удалось загрузить промокоды') })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [])

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await readResponse(await fetch(editing === 'new' ? '/api/admin/promocodes' : `/api/admin/promocodes/${editing}`, {
        method: editing === 'new' ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, discountValue: Number(form.discountValue) }),
      }))
      setEditing(null)
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить промокод') }
    finally { setBusy(false) }
  }
  async function toggle(code: PromoCode) {
    setBusy(true)
    setError('')
    try {
      await readResponse(await fetch(`/api/admin/promocodes/${code.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...code, isActive: !code.isActive }),
      }))
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось изменить промокод') }
    finally { setBusy(false) }
  }
  async function remove(code: PromoCode) {
    if (!confirm(`Удалить промокод ${code.code}? Скидки в ранее оформленных заказах сохранятся.`)) return
    setBusy(true)
    setError('')
    try {
      await readResponse(await fetch(`/api/admin/promocodes/${code.id}`, { method: 'DELETE' }))
      if (editing === code.id) setEditing(null)
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось удалить промокод') }
    finally { setBusy(false) }
  }

  return (
    <section className="mt-10 pt-8 border-t border-gray-200" aria-labelledby="promo-heading">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h2 id="promo-heading" className="text-xl font-bold text-gray-900">Промокоды</h2>
          <p className="text-sm text-gray-500 mt-1">Скидка на товары в процентах или рублях. Покупатель выбирает промокод или бонусы.</p>
        </div>
        <button type="button" disabled={busy} onClick={() => { setForm(empty); setEditing('new'); setError('') }}
          className="flex shrink-0 items-center gap-1.5 bg-pink-500 hover:bg-pink-600 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50">
          <Plus size={16} /> Добавить
        </button>
      </div>
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-3 text-sm mb-4">{error}</div>}
      {editing !== null && (
        <form onSubmit={save} className="bg-white border border-pink-200 rounded-xl p-5 mb-5 space-y-4">
          <h3 className="font-semibold">{editing === 'new' ? 'Новый промокод' : 'Редактировать промокод'}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="text-xs text-gray-600">Промокод
              <input className={`${inputClass} mt-1 uppercase`} required minLength={2} maxLength={40}
                placeholder="Например: FLOWERS15" value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value })} />
            </label>
            <label className="text-xs text-gray-600">Название для администратора
              <input className={`${inputClass} mt-1`} maxLength={120} placeholder="Например: Осенняя акция"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="text-xs text-gray-600">Тип скидки
              <select className={`${inputClass} mt-1`} value={form.discountType}
                onChange={e => setForm({ ...form, discountType: e.target.value as PromoCode['discountType'], discountValue: '' })}>
                <option value="percent">Процент (%)</option>
                <option value="fixed">Фиксированная сумма (₽)</option>
              </select>
            </label>
            <label className="text-xs text-gray-600">Скидка ({form.discountType === 'percent' ? '%' : '₽'})
              <input className={`${inputClass} mt-1`} type="number" required min={1} step={1}
                max={form.discountType === 'percent' ? 100 : 10000000} value={form.discountValue}
                onChange={e => setForm({ ...form, discountValue: e.target.value })} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-pink-500" checked={form.isActive}
              onChange={e => setForm({ ...form, isActive: e.target.checked })} /> Активен
          </label>
          <p className="text-xs text-gray-500">Код можно использовать повторно, пока он активен. Регистр букв не важен. Доставка не входит в скидку.</p>
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className="bg-pink-500 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {busy ? 'Сохранение…' : 'Сохранить'}
            </button>
            <button type="button" disabled={busy} onClick={() => setEditing(null)} className="border rounded-lg px-4 py-2 text-sm">Отмена</button>
          </div>
        </form>
      )}
      {loading ? <p className="text-sm text-gray-400">Загрузка промокодов…</p> : !error && codes.length === 0 ? (
        <p className="text-sm text-gray-500 py-5">Промокодов пока нет. Нажмите «Добавить», чтобы создать первый.</p>
      ) : (
        <ul className="space-y-2">
          {codes.map(code => (
            <li key={code.id} className={`bg-white border rounded-xl p-4 flex items-center gap-3 ${code.isActive ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm break-all">{code.code} {!code.isActive && <span className="text-xs text-gray-500 font-normal">· выключен</span>}</div>
                {code.name && <div className="text-sm text-gray-500 break-words">{code.name}</div>}
                <div className="text-pink-600 text-sm font-semibold mt-1">−{code.discountValue.toLocaleString('ru')} {code.discountType === 'percent' ? '%' : '₽'}</div>
              </div>
              <button type="button" disabled={busy} onClick={() => toggle(code)} aria-label={code.isActive ? `Выключить ${code.code}` : `Включить ${code.code}`} className="p-2">
                {code.isActive ? <ToggleRight className="text-green-500" size={20} /> : <ToggleLeft size={20} />}
              </button>
              <button type="button" disabled={busy} aria-label={`Редактировать ${code.code}`} className="p-2"
                onClick={() => { setEditing(code.id); setForm({ ...code, discountValue: String(code.discountValue) }); setError('') }}><Pencil size={15} /></button>
              <button type="button" disabled={busy} aria-label={`Удалить ${code.code}`} className="p-2 text-red-400" onClick={() => remove(code)}><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
