'use client'

import { useEffect, useState } from 'react'
import PromoCodesPanel from '@/components/admin/PromoCodesPanel'
import { Plus, Trash2, GripVertical, ToggleLeft, ToggleRight, Pencil, Check, X } from 'lucide-react'

interface BonusRule {
  id: number
  name: string
  bonusPercent: number
  conditionType: 'always' | 'min_amount' | 'min_orders' | 'first_order'
  conditionValue: number | null
  isActive: boolean
  sortOrder: number
}

const CONDITION_LABELS: Record<string, string> = {
  always: 'Всегда (любой заказ)',
  min_amount: 'Сумма заказа от ₽',
  min_orders: 'Кол-во заказов от',
  first_order: 'Первый заказ',
}

const empty: Omit<BonusRule, 'id'> = {
  name: '',
  bonusPercent: 25,
  conditionType: 'always',
  conditionValue: null,
  isActive: true,
  sortOrder: 0,
}

export default function BonusesPage() {
  const [rules, setRules] = useState<BonusRule[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<Omit<BonusRule, 'id'>>(empty)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/bonuses')
    setRules(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startNew() {
    setForm({ ...empty, sortOrder: rules.length })
    setEditId('new')
  }

  function startEdit(r: BonusRule) {
    setForm({ name: r.name, bonusPercent: r.bonusPercent, conditionType: r.conditionType, conditionValue: r.conditionValue, isActive: r.isActive, sortOrder: r.sortOrder })
    setEditId(r.id)
  }

  function cancel() { setEditId(null) }

  async function save() {
    setSaving(true)
    if (editId === 'new') {
      await fetch('/api/admin/bonuses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    } else {
      await fetch(`/api/admin/bonuses/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    }
    setSaving(false)
    setEditId(null)
    load()
  }

  async function toggle(r: BonusRule) {
    await fetch(`/api/admin/bonuses/${r.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !r.isActive }) })
    load()
  }

  async function remove(id: number) {
    if (!confirm('Удалить правило?')) return
    await fetch(`/api/admin/bonuses/${id}`, { method: 'DELETE' })
    load()
  }

  const needsValue = form.conditionType === 'min_amount' || form.conditionType === 'min_orders'

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Бонусные правила</h1>
          <p className="text-sm text-gray-500 mt-1">Правила применяются по порядку — срабатывает первое подходящее активное правило</p>
        </div>
        <button onClick={startNew} className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          <Plus size={16} /> Добавить
        </button>
      </div>

      {/* Форма */}
      {editId !== null && (
        <div className="bg-white border border-pink-200 rounded-xl p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-800">{editId === 'new' ? 'Новое правило' : 'Редактировать правило'}</h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Название правила</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              placeholder="Например: Стандартный бонус"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Условие</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                value={form.conditionType} onChange={e => setForm(f => ({ ...f, conditionType: e.target.value as BonusRule['conditionType'], conditionValue: null }))}>
                {Object.entries(CONDITION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            {needsValue && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {form.conditionType === 'min_amount' ? 'Минимальная сумма (₽)' : 'Минимум заказов (шт.)'}
                </label>
                <input type="number" min={0}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder={form.conditionType === 'min_amount' ? '3000' : '3'}
                  value={form.conditionValue ?? ''} onChange={e => setForm(f => ({ ...f, conditionValue: Number(e.target.value) || null }))} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Бонус (%)</label>
              <input type="number" min={0} max={100}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                value={form.bonusPercent} onChange={e => setForm(f => ({ ...f, bonusPercent: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Порядок (приоритет)</label>
              <input type="number" min={0}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={save} disabled={saving || !form.name}
              className="flex items-center gap-1.5 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              <Check size={14} /> {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button onClick={cancel} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm transition">
              <X size={14} /> Отмена
            </button>
          </div>
        </div>
      )}

      {/* Список правил */}
      {loading ? (
        <p className="text-gray-400 text-sm">Загрузка...</p>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-1">Правил пока нет</p>
          <p className="text-sm">Нажмите «Добавить» чтобы создать первое правило</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((r, i) => (
            <div key={r.id} className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${r.isActive ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}>
              <span className="text-gray-300 text-xs font-mono w-5 text-center">{i + 1}</span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm">{r.name}</span>
                  {!r.isActive && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Выкл</span>}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  <span className="font-semibold text-pink-600">{r.bonusPercent}%</span>
                  {' · '}
                  {CONDITION_LABELS[r.conditionType]}
                  {r.conditionValue != null && ` ${r.conditionValue}`}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => toggle(r)} title={r.isActive ? 'Выключить' : 'Включить'}
                  className="p-1.5 rounded-lg hover:bg-gray-50 transition text-gray-400">
                  {r.isActive ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
                </button>
                <button onClick={() => startEdit(r)} className="p-1.5 rounded-lg hover:bg-gray-50 transition text-gray-400">
                  <Pencil size={14} />
                </button>
                <button onClick={() => remove(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-medium mb-1">Как работает приоритет:</p>
        <p>Правила проверяются сверху вниз (по порядку). Применяется первое подходящее активное правило. Если ни одно не подходит — бонус не начисляется.</p>
      </div>
      <PromoCodesPanel />
    </div>
  )
}
