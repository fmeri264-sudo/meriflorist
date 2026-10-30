'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Package, Heart, Bell, Gift, LogOut, Plus, Trash2, Calendar, ShoppingCart, Minus, ArrowRight, MessageCircle, Send, X } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import Link from 'next/link'
import Image from 'next/image'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Новый', CONFIRMED: 'Собран', IN_PROGRESS: 'Доставляется',
  DELIVERED: 'Доставлен', CANCELLED: 'Отменён',
}
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  CONFIRMED: 'bg-blue-50 text-blue-600',
  IN_PROGRESS: 'bg-yellow-50 text-yellow-700',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-500',
}

interface Reminder { id: number; name: string; date: string | null }
interface Order {
  id: number; number: string; createdAt: string; status: string
  totalAmount: number; address: string | null; selfPickup: boolean
}
interface ChatMessage { role: 'buyer' | 'mary'; text: string; ts: string; photo_url?: string }

function OrderChat({ orderNumber, phone }: { orderNumber: string; phone: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevLenRef = useRef(0)

  const scrollToBottom = useCallback((force = false) => {
    const el = scrollRef.current
    if (!el) return
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    if (force || isAtBottom) el.scrollTop = el.scrollHeight
  }, [])

  const load = useCallback(async () => {
    const res = await fetch(`/api/account/chat/${orderNumber}?phone=${encodeURIComponent(phone)}`)
    if (res.ok) {
      const data = await res.json()
      const msgs = data.messages ?? []
      setMessages(msgs)
      if (msgs.length !== prevLenRef.current) {
        prevLenRef.current = msgs.length
        setTimeout(() => scrollToBottom(), 50)
      }
    }
  }, [orderNumber, phone, scrollToBottom])

  useEffect(() => { load(); }, [load])
  useEffect(() => { const t = setInterval(load, 7000); return () => clearInterval(t) }, [load])

  async function send() {
    if (!text.trim() || sending) return
    setSending(true)
    const res = await fetch(`/api/account/chat/${orderNumber}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message: text.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      const msgs = data.messages ?? []
      prevLenRef.current = msgs.length
      setMessages(msgs)
      setText('')
      setTimeout(() => scrollToBottom(true), 50)
    }
    setSending(false)
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="bg-gray-50 rounded-xl overflow-hidden">
        <div ref={scrollRef} className="max-h-60 overflow-y-auto p-3 space-y-2">
          {messages.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              Напишите нам — ответим в ближайшее время
            </p>
          ) : messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'buyer' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                m.role === 'buyer'
                  ? 'bg-rose-500 text-white rounded-br-sm'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
              }`}>
                {m.role === 'mary' && (
                  <p className="text-xs font-semibold text-rose-400 mb-0.5">Оператор</p>
                )}
                {m.photo_url && (
                  <img
                    src={`/api/chat-photo?path=${encodeURIComponent(m.photo_url)}`}
                    alt="фото"
                    className="rounded-xl mb-1 max-w-full max-h-60 object-contain"
                  />
                )}
                <p className="whitespace-pre-wrap">{m.text}</p>
                <p className={`text-xs mt-1 ${m.role === 'buyer' ? 'text-rose-200' : 'text-gray-400'}`}>
                  {new Date(m.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 p-2 border-t border-gray-200 bg-white">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Сообщение..."
            className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            className="bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white px-3 py-2 rounded-xl transition"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

function formatPhone(raw: string) { return '7' + raw.replace(/\D/g, '').slice(0, 10) }

export default function AccountPage() {
  const [tab, setTab] = useState('cart')
  const [phone, setPhone] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [openChat, setOpenChat] = useState<string | null>(null)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [bonuses, setBonuses] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  const cartItems = useCartStore(s => s.items)
  const cartTotal = useCartStore(s => s.total)
  const removeItem = useCartStore(s => s.removeItem)
  const updateQty = useCartStore(s => s.updateQty)
  const clearCart = useCartStore(s => s.clearCart)

  const TABS = [
    { id: 'cart', label: 'Корзина', icon: ShoppingCart, badge: cartItems.reduce((s, i) => s + i.qty, 0) },
    { id: 'orders', label: 'Мои заказы', icon: Package, badge: 0 },
    { id: 'reminders', label: 'Напоминания', icon: Bell, badge: 0 },
    { id: 'bonuses', label: 'Бонусы', icon: Gift, badge: 0 },
  ]

  // Восстанавливаем сессию из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('accountPhone')
    if (saved && saved.length >= 10) {
      setPhone(saved)
      setLoggedIn(true)
    }
  }, [])

  useEffect(() => {
    if (!loggedIn) return
    const digits = formatPhone(phone)

    fetch(`/api/account/reminders?phone=${encodeURIComponent(digits)}`)
      .then(r => r.json()).then(setReminders).catch(() => null)

    fetch(`/api/account/orders?phone=${encodeURIComponent(digits)}`)
      .then(r => r.json()).then(setOrders).catch(() => null)

    fetch(`/api/account/bonuses?phone=${encodeURIComponent(digits)}`)
      .then(r => r.json()).then(d => setBonuses(d.bonuses ?? 0)).catch(() => null)

    if (cartItems.length > 0) {
      fetch('/api/account/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: digits,
          items: cartItems.map(i => ({
            productId: i.product.id,
            name: i.product.name,
            image: i.product.images?.[0] ?? null,
            size: i.size, qty: i.qty, price: i.price,
          })),
          total: cartTotal(),
        }),
      }).catch(() => null)
    }
  }, [loggedIn, phone]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadReminders() {
    const res = await fetch(`/api/account/reminders?phone=${encodeURIComponent(formatPhone(phone))}`)
    if (res.ok) setReminders(await res.json())
  }

  async function addReminder() {
    const name = (nameRef.current?.value ?? '').trim()
    if (!name) return
    const date = (dateRef.current?.value ?? '').trim()
    setSaving(true); setSaveMsg('')
    const res = await fetch('/api/account/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: formatPhone(phone), name, date }),
    })
    setSaving(false)
    if (res.ok) {
      if (nameRef.current) nameRef.current.value = ''
      if (dateRef.current) dateRef.current.value = ''
      setSaveMsg('Сохранено!')
      loadReminders()
      setTimeout(() => setSaveMsg(''), 3000)
    } else { setSaveMsg('Ошибка сохранения') }
  }

  async function deleteReminder(id: number) {
    await fetch(`/api/account/reminders/${id}`, { method: 'DELETE' })
    loadReminders()
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 py-24">
          <h1 className="text-3xl font-bold mb-2 text-center">Личный кабинет</h1>
          <p className="text-gray-500 text-center mb-8">Войдите по номеру телефона</p>
          {cartItems.length > 0 && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-6 text-sm text-rose-700">
              <p className="font-medium mb-1">🛒 В вашей корзине {cartItems.reduce((s,i)=>s+i.qty,0)} товар(а) на {cartTotal().toLocaleString('ru')} ₽</p>
              <p className="text-rose-500 text-xs">Войдите, чтобы сохранить корзину и оформить заказ</p>
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-center border rounded-xl focus-within:ring-2 focus-within:ring-rose-300 overflow-hidden">
              <span className="pl-4 pr-1 text-sm text-gray-500 bg-white select-none shrink-0">+7</span>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="9001234567"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={e => {
                  if (e.key === 'Enter' && phone.length === 10) {
                    localStorage.setItem('accountPhone', formatPhone(phone))
                    setLoggedIn(true)
                  }
                }}
                className="flex-1 py-3 pr-4 text-sm bg-white focus:outline-none"
              />
            </div>
            <button onClick={() => {
              if (phone.length === 10) {
                localStorage.setItem('accountPhone', formatPhone(phone))
                setLoggedIn(true)
              }
            }}
              className="w-full bg-rose-500 text-white py-3 rounded-full font-semibold hover:bg-rose-600 transition">
              Войти
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Личный кабинет</h1>
            <p className="text-sm text-gray-400 mt-0.5">+7 {formatPhone(phone).slice(1)}</p>
          </div>
          <button onClick={() => { localStorage.removeItem('accountPhone'); setLoggedIn(false); setPhone('') }}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition">
            <LogOut className="w-4 h-4" /> Выйти
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map(({ id, label, icon: Icon, badge }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                tab === id ? 'bg-rose-500 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}>
              <Icon className="w-4 h-4" />
              {label}
              {badge > 0 && (
                <span className={`text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold ${
                  tab === id ? 'bg-white text-rose-500' : 'bg-rose-500 text-white'
                }`}>{badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Корзина */}
        {tab === 'cart' && (
          <div>
            {cartItems.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                <ShoppingCart className="w-14 h-14 mx-auto mb-4 text-gray-200" />
                <p className="text-gray-500 mb-2">Корзина пуста</p>
                <Link href="/catalog" className="text-rose-500 text-sm hover:underline">Перейти в каталог →</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-50">
                      {item.product.images?.[0] ? (
                        <Image src={item.product.images[0]} alt={item.product.name}
                          width={64} height={64} className="object-cover w-full h-full" unoptimized />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <ShoppingCart size={20} className="text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Размер: {item.size}</p>
                      <p className="text-rose-500 font-bold text-sm mt-1">{(item.price * item.qty).toLocaleString('ru')} ₽</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button"
                        onClick={() => updateQty(item.product.id, item.size, item.qty - 1)}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-rose-300 hover:text-rose-500 transition">
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center text-sm font-medium">{item.qty}</span>
                      <button type="button"
                        onClick={() => updateQty(item.product.id, item.size, item.qty + 1)}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-rose-300 hover:text-rose-500 transition">
                        <Plus size={12} />
                      </button>
                    </div>
                    <button type="button" onClick={() => removeItem(item.product.id, item.size)}
                      className="p-1.5 text-gray-300 hover:text-red-400 transition shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {/* Итог */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-600">Итого:</span>
                    <span className="text-2xl font-bold text-gray-900">{cartTotal().toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/checkout"
                      className="flex-1 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-full font-semibold transition text-sm">
                      Оформить заказ <ArrowRight size={16} />
                    </Link>
                    <button type="button" onClick={() => { if (confirm('Очистить корзину?')) clearCart() }}
                      className="px-4 py-3 border border-gray-200 rounded-full text-gray-400 hover:text-red-400 hover:border-red-200 transition text-sm">
                      Очистить
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Заказы */}
        {tab === 'orders' && (
          <div>
            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                <Package className="w-14 h-14 mx-auto mb-4 text-gray-200" />
                <p className="text-gray-500">Заказов пока нет</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(o => (
                  <div key={o.id} className="bg-white border border-gray-100 rounded-2xl p-5">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">Заказ #{o.number}</p>
                        <p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString('ru-RU')}</p>
                      </div>
                      <span className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{o.selfPickup ? 'Самовывоз' : (o.address ?? '—')}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="font-bold text-gray-900">{o.totalAmount.toLocaleString('ru')} ₽</p>
                      <button
                        onClick={() => setOpenChat(openChat === o.number ? null : o.number)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition ${
                          openChat === o.number
                            ? 'bg-rose-500 text-white border-rose-500'
                            : 'border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-500'
                        }`}
                      >
                        {openChat === o.number ? <X size={12} /> : <MessageCircle size={12} />}
                        {openChat === o.number ? 'Закрыть' : 'Написать оператору'}
                      </button>
                    </div>
                    {openChat === o.number && (
                      <OrderChat orderNumber={o.number} phone={formatPhone(phone)} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Напоминания */}
        {tab === 'reminders' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-1">Добавить напоминание</h3>
              <p className="text-xs text-gray-400 mb-4">Сохраните важные даты — мы напомним заранее</p>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <input ref={nameRef} type="text" placeholder="День рождения жены"
                  className="border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                  onKeyDown={e => e.key === 'Enter' && addReminder()} />
                <input ref={dateRef} type="date"
                  className="border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200" />
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={addReminder} disabled={saving}
                  className="flex items-center gap-2 bg-rose-500 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-rose-600 disabled:opacity-50 transition">
                  <Plus size={14} /> {saving ? 'Сохраняем...' : 'Добавить'}
                </button>
                {saveMsg && <span className={`text-sm ${saveMsg.includes('Ошибка') ? 'text-red-500' : 'text-green-600'}`}>{saveMsg}</span>}
              </div>
            </div>

            {reminders.length > 0 ? (
              <div className="space-y-2">
                {reminders.map(r => (
                  <div key={r.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3">
                    <Calendar size={16} className="text-rose-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900">{r.name}</p>
                      {r.date && <p className="text-xs text-gray-400">{new Date(r.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p>}
                    </div>
                    <button type="button" onClick={() => deleteReminder(r.id)}
                      className="p-1.5 text-gray-300 hover:text-red-400 transition"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Напоминаний пока нет</p>
              </div>
            )}
          </div>
        )}

        {/* Бонусы */}
        {tab === 'bonuses' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-24 h-24 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <Gift className="w-10 h-10 text-rose-500" />
            </div>
            {bonuses === null ? (
              <p className="text-gray-400 text-sm">Загрузка...</p>
            ) : (
              <>
                <p className="text-4xl font-extrabold text-rose-500 mb-2">{bonuses.toLocaleString('ru')}</p>
                <p className="text-gray-500 mb-6">бонусных рублей</p>
                <p className="text-sm text-gray-400 max-w-xs mx-auto">
                  1 бонус = 1 рубль. Используйте при следующей покупке в Meri Florist.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
