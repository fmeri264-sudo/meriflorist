'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Plus, Search, Trash2, Edit3, Check, X, ChevronDown, ChevronUp,
  Send, Star, Gift, Phone, Mail, MapPin, Calendar, ShoppingBag, Users,
} from 'lucide-react'
import ExcelIO from '@/components/admin/ExcelIO'

interface Holiday { name: string; date: string }
interface Customer {
  id: number; firstName: string; lastName: string | null
  phone: string | null; email: string | null; address: string | null
  comment: string | null; bonuses: number; points: number
  holidays: Holiday[]; createdAt: string
}
interface Order {
  id: number; number: string; createdAt: string; status: string
  totalAmount: number; address: string | null; selfPickup: boolean
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Новый', CONFIRMED: 'Подтверждён', IN_PROGRESS: 'В работе',
  DELIVERED: 'Доставлен', CANCELLED: 'Отменён',
}
const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300'
type FormData = Omit<Customer, 'id' | 'createdAt'>
const emptyForm = (): FormData => ({ firstName: '', lastName: '', phone: '', email: '', address: '', comment: '', bonuses: 0, points: 0, holidays: [] })

function fullName(c: Customer) {
  return [c.firstName, c.lastName].filter(Boolean).join(' ') || '—'
}

// Блок праздников — uncontrolled inputs через рефы, без связи с состоянием родителя
function HolidaysBlock({
  holidays,
  nameRef,
  dateRef,
  onAdd,
  onRemove,
}: {
  holidays: Holiday[]
  nameRef: React.RefObject<HTMLInputElement | null>
  dateRef: React.RefObject<HTMLInputElement | null>
  onAdd: () => void
  onRemove: (i: number) => void
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-2">Важные даты</label>
      <div className="space-y-1.5 mb-2">
        {holidays.map((h, i) => (
          <div key={i} className="flex items-center gap-2 bg-pink-50 rounded-lg px-3 py-1.5 text-sm">
            <Calendar size={13} className="text-pink-400 shrink-0" />
            <span className="flex-1">{h.name}</span>
            {h.date && <span className="text-gray-400 text-xs font-mono">{h.date}</span>}
            <button type="button" onClick={() => onRemove(i)} className="text-gray-300 hover:text-red-400">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          ref={nameRef}
          className={`${inp} flex-1`}
          defaultValue=""
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd() } }}
          placeholder="День рождения, годовщина..."
        />
        <input
          ref={dateRef}
          className={`${inp} w-28`}
          defaultValue=""
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd() } }}
          placeholder="25.05"
          maxLength={10}
        />
        <button
          type="button"
          onClick={onAdd}
          className="px-3 py-2 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600 shrink-0"
        >
          <Plus size={14} />
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1">Нажмите + или Enter чтобы добавить · дата необязательна</p>
    </div>
  )
}

// Брошенная корзина
interface SavedCartItem { productId: number; name: string; image: string | null; size: string; qty: number; price: number }

function AbandonedCart({ phone }: { phone: string }) {
  const [cart, setCart] = useState<{ items: SavedCartItem[]; total: number; updatedAt: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/account/cart?phone=${encodeURIComponent(phone)}`)
      .then(r => r.json())
      .then(d => { setCart(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [phone])

  if (loading) return <p className="text-xs text-gray-400 py-2">Загрузка...</p>
  if (!cart || !cart.items?.length) return <p className="text-xs text-gray-400 py-2">Корзина пуста</p>

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-orange-500 font-medium">
          Итого: {cart.total.toLocaleString('ru')} ₽ · {new Date(cart.updatedAt).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      {cart.items.map((item, i) => (
        <div key={i} className="flex items-center gap-3 bg-orange-50 rounded-lg px-3 py-2 text-sm">
          {item.image
            ? <img src={item.image} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
            : <ShoppingBag size={13} className="text-orange-300 shrink-0" />}
          <span className="flex-1 text-gray-700 text-xs truncate">{item.name}</span>
          <span className="text-xs text-gray-400 shrink-0">р.{item.size}</span>
          <span className="text-xs text-gray-500 shrink-0">×{item.qty}</span>
          <span className="font-semibold text-gray-800 shrink-0 text-xs">{(item.price * item.qty).toLocaleString('ru')} ₽</span>
        </div>
      ))}
    </div>
  )
}

// История заказов
function OrderHistory({ customerId }: { customerId: number }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/customers/${customerId}`)
      .then(r => r.json())
      .then(d => { setOrders(d.orders ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [customerId])

  if (loading) return <p className="text-xs text-gray-400 py-2">Загрузка...</p>
  if (!orders.length) return <p className="text-xs text-gray-400 py-2">Заказов нет</p>

  return (
    <div className="space-y-1.5">
      {orders.map(o => (
        <div key={o.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 text-sm">
          <ShoppingBag size={13} className="text-gray-400 shrink-0" />
          <span className="font-medium text-gray-700 w-20 shrink-0">#{o.number}</span>
          <span className={`px-1.5 py-0.5 rounded text-xs ${o.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : o.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
            {STATUS_LABELS[o.status] ?? o.status}
          </span>
          <span className="flex-1 text-gray-500 text-xs truncate">{o.selfPickup ? 'Самовывоз' : (o.address ?? '—')}</span>
          <span className="font-semibold text-gray-800 shrink-0">{o.totalAmount.toLocaleString('ru')} ₽</span>
          <span className="text-xs text-gray-400 shrink-0">{new Date(o.createdAt).toLocaleDateString('ru')}</span>
        </div>
      ))}
    </div>
  )
}

// ── Главный компонент ─────────────────────────────────────────────────────────
export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [editData, setEditData] = useState<FormData>(emptyForm())
  const editNameRef = useRef<HTMLInputElement>(null)
  const editDateRef = useRef<HTMLInputElement>(null)
  const [adding, setAdding] = useState(false)
  const [newData, setNewData] = useState<FormData>(emptyForm())
  const newNameRef = useRef<HTMLInputElement>(null)
  const newDateRef = useRef<HTMLInputElement>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showNotify, setShowNotify] = useState(false)
  const [notify, setNotify] = useState({ subject: '', message: '' })
  const [notifying, setNotifying] = useState(false)
  const [notifyResult, setNotifyResult] = useState<string | null>(null)
  const [showOrders, setShowOrders] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/customers?page=${page}&q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setCustomers(Array.isArray(data.customers) ? data.customers : [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [page, q])

  useEffect(() => { load() }, [load])

  function startEdit(c: Customer) {
    setEditing(c.id)
    setSaveError(null)
    if (editNameRef.current) editNameRef.current.value = ''
    if (editDateRef.current) editDateRef.current.value = ''
    setEditData({
      firstName: c.firstName, lastName: c.lastName ?? '', phone: c.phone ?? '',
      email: c.email ?? '', address: c.address ?? '', comment: c.comment ?? '',
      bonuses: c.bonuses, points: c.points, holidays: [...(c.holidays ?? [])],
    })
  }

  function cancelEdit() {
    setEditing(null)
    setSaveError(null)
    if (editNameRef.current) editNameRef.current.value = ''
    if (editDateRef.current) editDateRef.current.value = ''
  }

  // Праздники для формы редактирования
  function addEditHoliday() {
    const name = (editNameRef.current?.value ?? '').trim()
    if (!name) return
    const date = (editDateRef.current?.value ?? '').trim()
    setEditData(prev => ({
      ...prev,
      holidays: [...(prev.holidays ?? []), { name, date }],
    }))
    if (editNameRef.current) editNameRef.current.value = ''
    if (editDateRef.current) editDateRef.current.value = ''
  }

  function removeEditHoliday(i: number) {
    setEditData(prev => ({
      ...prev,
      holidays: (prev.holidays ?? []).filter((_, idx) => idx !== i),
    }))
  }

  // Праздники для формы добавления
  function addNewHoliday() {
    const name = (newNameRef.current?.value ?? '').trim()
    if (!name) return
    const date = (newDateRef.current?.value ?? '').trim()
    setNewData(prev => ({
      ...prev,
      holidays: [...(prev.holidays ?? []), { name, date }],
    }))
    if (newNameRef.current) newNameRef.current.value = ''
    if (newDateRef.current) newDateRef.current.value = ''
  }

  function removeNewHoliday(i: number) {
    setNewData(prev => ({
      ...prev,
      holidays: (prev.holidays ?? []).filter((_, idx) => idx !== i),
    }))
  }

  async function saveEdit(id: number) {
    setSaveError(null)
    const res = await fetch(`/api/admin/customers/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setSaveError(d.error ?? 'Ошибка сохранения')
      return
    }
    setEditing(null)
    setSaveError(null)
    load()
  }

  async function addCustomer() {
    if (!newData.firstName.trim()) return
    setSaveError(null)
    const res = await fetch('/api/admin/customers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newData),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setSaveError(d.error ?? 'Ошибка сохранения')
      return
    }
    setAdding(false)
    setNewData(emptyForm())
    if (newNameRef.current) newNameRef.current.value = ''
    if (newDateRef.current) newDateRef.current.value = ''
    setSaveError(null)
    load()
  }

  async function remove(id: number) {
    if (!confirm('Удалить покупателя?')) return
    await fetch(`/api/admin/customers/${id}`, { method: 'DELETE' })
    load()
  }

  function toggleSelect(id: number) {
    setSelectedIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function sendNotify() {
    if (!notify.subject || !notify.message) return
    setNotifying(true); setNotifyResult(null)
    try {
      const res = await fetch('/api/admin/customers/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...notify, recipientIds: selectedIds.size > 0 ? [...selectedIds] : undefined }),
      })
      const data = await res.json()
      setNotifyResult(data.error ? `Ошибка: ${data.error}` : `Отправлено: ${data.sent} из ${data.total}`)
    } catch { setNotifyResult('Ошибка соединения') }
    setNotifying(false)
  }

  const totalPages = Math.ceil(total / 30)

  // Общий рендер полей формы (без праздников)
  function renderFields(data: FormData, setData: (fn: (p: FormData) => FormData) => void) {
    const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setData(prev => ({ ...prev, [key]: e.target.value }))
    const setNum = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setData(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Имя *</label>
            <input className={inp} value={data.firstName} onChange={set('firstName')} placeholder="Анна" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Фамилия</label>
            <input className={inp} value={data.lastName ?? ''} onChange={set('lastName')} placeholder="Иванова" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Телефон</label>
            <input className={inp} value={data.phone ?? ''} onChange={set('phone')} placeholder="+7 (___) ___-__-__" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email</label>
            <input className={inp} value={data.email ?? ''} onChange={set('email')} placeholder="mail@example.com" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Адрес</label>
          <input className={inp} value={data.address ?? ''} onChange={set('address')} placeholder="ул. Примерная, д. 1, кв. 2" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Комментарий</label>
          <textarea className={`${inp} resize-none`} rows={2} value={data.comment ?? ''} onChange={set('comment')} placeholder="VIP, предпочтения..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Бонусы (₽)</label>
            <input className={inp} type="number" min={0} value={data.bonuses} onChange={setNum('bonuses')} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Баллы</label>
            <input className={inp} type="number" min={0} value={data.points} onChange={setNum('points')} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Покупатели</h1>
          <p className="text-sm text-gray-500 mt-0.5">Всего: {total}</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <ExcelIO type="customers" onImported={load} />
          <button onClick={() => setShowNotify(true)}
            className="flex items-center gap-2 border border-pink-300 text-pink-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-pink-50 transition">
            <Send size={15} /> Рассылка
          </button>
          <button onClick={() => { setAdding(v => !v); setNewData(emptyForm()); setSaveError(null) }}
            className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <Plus size={15} /> Добавить
          </button>
        </div>
      </div>

      {/* Поиск */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
          placeholder="Поиск по имени, телефону, email..."
          value={q} onChange={e => { setQ(e.target.value); setPage(1) }} />
      </div>

      {/* Форма добавления */}
      {adding && (
        <div className="bg-white rounded-xl border border-pink-100 p-5 mb-4 space-y-4">
          <p className="font-semibold text-gray-800">Новый покупатель</p>
          {renderFields(newData, setNewData)}
          <HolidaysBlock
            holidays={newData.holidays}
            nameRef={newNameRef}
            dateRef={newDateRef}
            onAdd={addNewHoliday}
            onRemove={removeNewHoliday}
          />
          {saveError && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setAdding(false); setSaveError(null) }}
              className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-200">Отмена</button>
            <button type="button" onClick={addCustomer}
              className="px-4 py-2 text-sm bg-pink-500 text-white rounded-lg hover:bg-pink-600">Сохранить</button>
          </div>
        </div>
      )}

      {/* Диалог рассылки */}
      {showNotify && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Send size={18} className="text-pink-500" /> Рассылка</h2>
              <button type="button" onClick={() => { setShowNotify(false); setNotifyResult(null) }}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="bg-pink-50 rounded-lg p-3 text-sm text-pink-700">
              {selectedIds.size > 0 ? `Выбрано ${selectedIds.size} покупателей` : `Всем с email`}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Тема</label>
              <input className={inp} value={notify.subject} onChange={e => setNotify(n => ({ ...n, subject: e.target.value }))} placeholder="Акция — скидка 20%!" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Текст</label>
              <textarea className={`${inp} resize-none`} rows={6} value={notify.message} onChange={e => setNotify(n => ({ ...n, message: e.target.value }))} placeholder="Дорогой покупатель..." />
            </div>
            {notifyResult && <p className={`text-sm ${notifyResult.startsWith('Ошибка') ? 'text-red-500' : 'text-green-600'}`}>{notifyResult}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setShowNotify(false); setNotifyResult(null) }} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg">Закрыть</button>
              <button type="button" onClick={sendNotify} disabled={notifying || !notify.subject || !notify.message}
                className="flex items-center gap-2 px-5 py-2 bg-pink-500 text-white rounded-lg text-sm font-medium hover:bg-pink-600 disabled:opacity-50">
                <Send size={14} /> {notifying ? 'Отправляем...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Список */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>{q ? 'Ничего не найдено' : 'Покупателей пока нет'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Строка */}
              <div className="flex items-center gap-3 px-4 py-3">
                <input type="checkbox" className="accent-pink-500 w-4 h-4 shrink-0"
                  checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{fullName(c)}</span>
                    {c.phone && <span className="flex items-center gap-1 text-xs text-gray-500"><Phone size={11} />{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1 text-xs text-gray-500"><Mail size={11} />{c.email}</span>}
                    {c.bonuses > 0 && <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full"><Gift size={10} />{c.bonuses} ₽</span>}
                    {c.points > 0 && <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded-full"><Star size={10} />{c.points} б.</span>}
                    {(c.holidays?.length ?? 0) > 0 && <span className="flex items-center gap-1 text-xs bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-full"><Calendar size={10} />{c.holidays.length} дат</span>}
                  </div>
                  {c.address && <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><MapPin size={10} />{c.address}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => { startEdit(c); setExpanded(c.id) }}
                    className="p-1.5 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-lg transition"><Edit3 size={14} /></button>
                  <button type="button" onClick={() => remove(c.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={14} /></button>
                  <button type="button" onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                    {expanded === c.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Развёрнутое */}
              {expanded === c.id && (
                <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                  {editing === c.id ? (
                    <>
                      {renderFields(editData, setEditData)}
                      <HolidaysBlock
                        holidays={editData.holidays}
                        nameRef={editNameRef}
                        dateRef={editDateRef}
                        onAdd={addEditHoliday}
                        onRemove={removeEditHoliday}
                      />
                      {saveError && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>}
                      <div className="flex gap-2 justify-end">
                        <button type="button" onClick={cancelEdit} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <X size={13} /> Отмена
                        </button>
                        <button type="button" onClick={() => saveEdit(c.id)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-pink-500 text-white rounded-lg hover:bg-pink-600">
                          <Check size={13} /> Сохранить
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {c.comment && (
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Комментарий</p>
                          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{c.comment}</p>
                        </div>
                      )}
                      {(c.holidays?.length ?? 0) > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1.5">Важные даты</p>
                          <div className="flex flex-wrap gap-2">
                            {c.holidays.map((h, i) => (
                              <span key={i} className="flex items-center gap-1.5 bg-pink-50 text-pink-700 text-xs px-2.5 py-1 rounded-full">
                                <Calendar size={11} /> {h.name}{h.date ? ` · ${h.date}` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {c.phone && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
                            <ShoppingBag size={11} className="text-orange-400" /> Брошенная корзина
                          </p>
                          <AbandonedCart phone={c.phone.replace(/\D/g, '')} />
                        </div>
                      )}
                      <div>
                        <button type="button" onClick={() => setShowOrders(showOrders === c.id ? null : c.id)}
                          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-pink-500 transition mb-2">
                          <ShoppingBag size={14} /> История заказов
                          {showOrders === c.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                        {showOrders === c.id && <OrderHistory customerId={c.id} />}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">← Назад</button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Вперёд →</button>
        </div>
      )}
    </div>
  )
}
