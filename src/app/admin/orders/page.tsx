'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Truck, RefreshCw, Camera, Send } from 'lucide-react'
import ExcelIO from '@/components/admin/ExcelIO'

interface OrderItem {
  id: number
  productName: string
  quantity: number
  price: number
  product: { name: string; images: string[] } | null
}

interface Order {
  id: number
  number: string
  createdAt: string
  status: string
  paymentStatus: string
  paymentMethod: string
  totalAmount: number
  recipientName: string
  recipientPhone: string
  address: string | null
  deliveryDate: string | null
  cardText: string | null
  comment: string | null
  selfPickup: boolean
  ydClaimId: string | null
  ydStatus: string | null
  tbankPaymentId: string | null
  items: OrderItem[]
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Новый',
  CONFIRMED: 'Собран',
  IN_PROGRESS: 'Доставляется',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

const YD_STATUS_LABELS: Record<string, string> = {
  new: 'Новая',
  estimating: 'Расчёт цены',
  ready_for_approval: 'Ожидает подтверждения',
  accepted: 'Принята',
  performer_lookup: 'Поиск курьера',
  performer_found: 'Курьер найден',
  pickup_arrived: 'Курьер на месте',
  pickuped: 'Забрал заказ',
  delivery_arrived: 'У получателя',
  delivered: 'Доставлен',
  delivered_finish: 'Завершено',
  returning: 'Возврат',
  returned_finish: 'Возвращён',
  cancelled: 'Отменена',
  failed: 'Ошибка',
  error: 'Ошибка',
}

const YD_STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600',
  estimating: 'bg-gray-100 text-gray-600',
  ready_for_approval: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  performer_lookup: 'bg-blue-100 text-blue-700',
  performer_found: 'bg-indigo-100 text-indigo-700',
  pickup_arrived: 'bg-purple-100 text-purple-700',
  pickuped: 'bg-purple-100 text-purple-700',
  delivery_arrived: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  delivered_finish: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  failed: 'bg-red-100 text-red-600',
  error: 'bg-red-100 text-red-600',
}

const PAY_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Не оплачен',
  PAID: 'Оплачен',
  FAILED: 'Ошибка оплаты',
  REFUNDED: 'Возврат',
}

const PAY_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-500',
  PAID: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-600',
  REFUNDED: 'bg-orange-100 text-orange-600',
}

const PAY_METHOD_LABELS: Record<string, string> = {
  ONLINE: 'Онлайн',
  CASH: 'Наличные',
  SBP: 'СБП',
  PENDING: '',
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [delivering, setDelivering] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState<number | null>(null)
  const [ydMessages, setYdMessages] = useState<Record<number, string>>({})
  const [photoUrls, setPhotoUrls] = useState<Record<number, string>>({})
  const [photoUploading, setPhotoUploading] = useState<number | null>(null)
  const [photoSending, setPhotoSending] = useState<Record<number, string>>({})
  const [photoMessages, setPhotoMessages] = useState<Record<number, string>>({})
  const [refunding, setRefunding] = useState<number | null>(null)
  const [refundMessages, setRefundMessages] = useState<Record<number, string>>({})
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/orders?page=${page}`)
    const data = await res.json()
    setOrders(data.orders)
    setTotal(data.total)
    setLoading(false)
  }, [page])

  useEffect(() => { load() }, [load])

  async function refundOrder(order: Order) {
    if (!confirm(`Вернуть оплату по заказу #${order.id}? Сумма вернётся покупателю через T-Bank.`)) return
    setRefunding(order.id)
    setRefundMessages(m => ({ ...m, [order.id]: '' }))
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/refund`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setRefundMessages(m => ({ ...m, [order.id]: `Ошибка: ${data.error}` }))
      } else {
        setRefundMessages(m => ({ ...m, [order.id]: 'Возврат выполнен ✓' }))
        load()
      }
    } catch {
      setRefundMessages(m => ({ ...m, [order.id]: 'Ошибка соединения' }))
    }
    setRefunding(null)
  }

  async function changeStatus(id: number, status: string) {
    await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    load()
  }

  async function callCourier(order: Order) {
    setDelivering(order.id)
    setYdMessages(m => ({ ...m, [order.id]: '' }))
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/deliver`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setYdMessages(m => ({ ...m, [order.id]: `Ошибка: ${data.error}` }))
      } else {
        setYdMessages(m => ({
          ...m,
          [order.id]: `Заявка создана · ID: ${data.claimId} · Статус: ${YD_STATUS_LABELS[data.status] ?? data.status}`,
        }))
        load()
      }
    } catch {
      setYdMessages(m => ({ ...m, [order.id]: 'Ошибка соединения с Яндекс Доставкой' }))
    }
    setDelivering(null)
  }

  async function refreshStatus(order: Order) {
    setRefreshing(order.id)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/deliver`)
      const data = await res.json()
      if (res.ok) {
        setYdMessages(m => ({ ...m, [order.id]: `Статус: ${data.statusLabel ?? YD_STATUS_LABELS[data.status] ?? data.status}` }))
        load()
      }
    } catch { /* ignore */ }
    setRefreshing(null)
  }

  async function uploadPhoto(orderId: number, file: File) {
    setPhotoUploading(orderId)
    setPhotoMessages(m => ({ ...m, [orderId]: '' }))
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Ошибка загрузки')
      setPhotoUrls(m => ({ ...m, [orderId]: data.url }))
    } catch (e) {
      setPhotoMessages(m => ({ ...m, [orderId]: `Ошибка загрузки: ${e}` }))
    }
    setPhotoUploading(null)
  }

  async function sendViaMax(order: Order) {
    const url = photoUrls[order.id]
    if (!url) return
    setPhotoSending(m => ({ ...m, [order.id]: 'max' }))
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/send-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl: url }),
      })
      const data = await res.json()
      if (data.error) {
        setPhotoMessages(m => ({ ...m, [order.id]: `MAX: ${data.error}` }))
      } else {
        setPhotoMessages(m => ({ ...m, [order.id]: 'Отправлено в MAX ✓' }))
      }
    } catch {
      setPhotoMessages(m => ({ ...m, [order.id]: 'MAX: ошибка соединения' }))
    }
    setPhotoSending(m => ({ ...m, [order.id]: '' }))
  }

  function waLink(phone: string, photoUrl: string, name: string) {
    const clean = phone.replace(/\D/g, '').replace(/^8/, '7')
    const text = encodeURIComponent(`${name ? name + ', ваш' : 'Ваш'} букет готов! 🌸\nФото: ${photoUrl}`)
    return `https://wa.me/${clean}?text=${text}`
  }

  function tgLink(photoUrl: string, name: string) {
    const text = encodeURIComponent(`${name ? name + ', ваш' : 'Ваш'} букет готов! 🌸`)
    return `https://t.me/share/url?url=${encodeURIComponent(photoUrl)}&text=${text}`
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Заказы</h1>
          <p className="text-gray-500 text-sm mt-0.5">Всего: {total}</p>
        </div>
        <ExcelIO type="orders" onImported={load} importLabel="Обновить статусы из Excel" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Заказов пока нет</div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition"
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-gray-900">#{order.id}</span>
                    <span className="text-xs text-gray-500 font-mono">({order.number})</span>
                    <span className="text-gray-700">{order.recipientName}</span>
                    <span className="text-gray-400 text-sm">{order.recipientPhone}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAY_STATUS_COLORS[order.paymentStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                      {PAY_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                      {order.paymentMethod && PAY_METHOD_LABELS[order.paymentMethod] && ` · ${PAY_METHOD_LABELS[order.paymentMethod]}`}
                    </span>
                    {order.ydClaimId && order.ydStatus && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${YD_STATUS_COLORS[order.ydStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                        <Truck size={11} />
                        {YD_STATUS_LABELS[order.ydStatus] ?? order.ydStatus}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 mt-0.5">
                    {new Date(order.createdAt).toLocaleString('ru')}
                    {order.deliveryDate && ` · Доставка: ${order.deliveryDate}`}
                    {order.selfPickup && ' · Самовывоз'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{order.totalAmount.toLocaleString('ru')} ₽</div>
                  <div className="text-xs text-gray-400">{order.items.length} поз.</div>
                </div>
              </div>

              {expanded === order.id && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 mb-1">Адрес доставки</p>
                      <p className="text-gray-800">{order.address || '—'}</p>
                    </div>
                    {order.cardText && (
                      <div>
                        <p className="text-gray-400 mb-1">Текст на открытке</p>
                        <p className="text-gray-800 italic">«{order.cardText}»</p>
                      </div>
                    )}
                    {order.comment && (
                      <div>
                        <p className="text-gray-400 mb-1">Комментарий</p>
                        <p className="text-gray-800">{order.comment}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-gray-400 text-sm mb-2">Состав заказа</p>
                    <div className="space-y-1">
                      {order.items.map(item => (
                        <div key={item.id} className="flex items-center gap-3 text-sm">
                          <span className="text-gray-500">{item.quantity}×</span>
                          <span className="text-gray-800 flex-1">{item.product?.name ?? item.productName}</span>
                          <span className="font-medium">{(item.price * item.quantity).toLocaleString('ru')} ₽</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Яндекс Доставка */}
                  {!order.selfPickup && (
                    <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Truck size={15} className="text-yellow-500" />
                        Яндекс Доставка
                      </p>

                      {order.ydClaimId ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs text-gray-400">ID заявки: <span className="font-mono text-gray-600">{order.ydClaimId}</span></span>
                            {order.ydStatus && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${YD_STATUS_COLORS[order.ydStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                                {YD_STATUS_LABELS[order.ydStatus] ?? order.ydStatus}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => refreshStatus(order)}
                            disabled={refreshing === order.id}
                            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                          >
                            <RefreshCw size={12} className={refreshing === order.id ? 'animate-spin' : ''} />
                            Обновить статус
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => callCourier(order)}
                          disabled={delivering === order.id}
                          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                        >
                          <Truck size={15} className={delivering === order.id ? 'animate-bounce' : ''} />
                          {delivering === order.id ? 'Создаём заявку...' : 'Вызвать курьера'}
                        </button>
                      )}

                      {ydMessages[order.id] && (
                        <p className={`text-xs ${ydMessages[order.id].startsWith('Ошибка') ? 'text-red-500' : 'text-green-600'}`}>
                          {ydMessages[order.id]}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Отправить фото покупателю */}
                  <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Camera size={15} className="text-rose-400" />
                      Отправить фото покупателю
                    </p>

                    {photoUrls[order.id] ? (
                      <div className="space-y-3">
                        <img src={photoUrls[order.id]} alt="Фото букета" className="w-32 h-32 object-cover rounded-lg border border-gray-200" />
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => sendViaMax(order)}
                            disabled={photoSending[order.id] === 'max'}
                            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                          >
                            <Send size={12} />
                            {photoSending[order.id] === 'max' ? 'Отправка...' : 'MAX'}
                          </button>
                          <a
                            href={waLink(order.recipientPhone, photoUrls[order.id], order.recipientName)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
                          >
                            <Send size={12} />
                            WhatsApp
                          </a>
                          <a
                            href={tgLink(photoUrls[order.id], order.recipientName)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
                          >
                            <Send size={12} />
                            Telegram
                          </a>
                          <button
                            onClick={() => {
                              setPhotoUrls(m => { const n = { ...m }; delete n[order.id]; return n })
                              setPhotoMessages(m => { const n = { ...m }; delete n[order.id]; return n })
                            }}
                            className="text-xs text-gray-400 hover:text-gray-600 px-2"
                          >
                            Другое фото
                          </button>
                        </div>
                        {photoMessages[order.id] && (
                          <p className={`text-xs ${photoMessages[order.id].startsWith('MAX: ') || photoMessages[order.id].includes('ошибка') || photoMessages[order.id].includes('Ошибка') ? 'text-red-500' : 'text-green-600'}`}>
                            {photoMessages[order.id]}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={el => { fileInputRefs.current[order.id] = el }}
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) uploadPhoto(order.id, file)
                            e.target.value = ''
                          }}
                        />
                        <button
                          onClick={() => fileInputRefs.current[order.id]?.click()}
                          disabled={photoUploading === order.id}
                          className="flex items-center gap-2 border border-dashed border-rose-300 text-rose-500 hover:bg-rose-50 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                        >
                          <Camera size={15} />
                          {photoUploading === order.id ? 'Загрузка...' : 'Загрузить фото'}
                        </button>
                        {photoMessages[order.id] && (
                          <p className="text-xs text-red-500">{photoMessages[order.id]}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-gray-400 text-sm mb-2">Изменить статус</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <button
                          key={value}
                          onClick={() => changeStatus(order.id, value)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                            order.status === value
                              ? 'bg-pink-500 text-white border-pink-500'
                              : 'border-gray-200 text-gray-600 hover:border-pink-300 hover:text-pink-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {order.paymentStatus === 'PAID' && (
                    <div className="border border-gray-100 rounded-xl p-4 space-y-2">
                      <p className="text-sm font-semibold text-gray-700">Возврат оплаты</p>
                      <p className="text-xs text-gray-400">Полный возврат через T-Bank покупателю</p>
                      <button
                        onClick={() => refundOrder(order)}
                        disabled={refunding === order.id}
                        className="flex items-center gap-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                      >
                        {refunding === order.id ? 'Выполняется...' : '↩ Вернуть деньги'}
                      </button>
                      {refundMessages[order.id] && (
                        <p className={`text-xs ${refundMessages[order.id].includes('Ошибка') ? 'text-red-500' : 'text-green-600'}`}>
                          {refundMessages[order.id]}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition">
            ← Назад
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition">
            Вперёд →
          </button>
        </div>
      )}
    </div>
  )
}
