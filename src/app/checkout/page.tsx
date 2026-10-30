'use client'

import { useCartStore } from '@/store/cart'
import { formatPrice, getDeliveryTimeSlots, getMinDeliveryDate } from '@/lib/utils'
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { promoDiscount as calculatePromoDiscount, type PromoCode } from '@/lib/promocodes'

const PICKUP_LOCATIONS = [
  {
    id: 1,
    name: 'Главный магазин',
    address: 'пр. Испытателей, 33',
    full: 'Санкт-Петербург, пр. Испытателей, 33',
    hint: 'Торец дома со стороны ул. Маршала Новикова. Левая серая металлическая дверь с вывеской «Цветы». По ступенькам вниз. Дверь справа с вывеской «ЦВЕТЫ».',
  },
  
]

const inp = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300'

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore()
  const router = useRouter()

  const [selfPickup, setSelfPickup] = useState(false)
  const [pickupLocationId, setPickupLocationId] = useState(1)
  const [deliveryQuote, setDeliveryQuote] = useState<{ address: string; price: number | null } | null>(null)
  const [loadingCost, setLoadingCost] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Бонусы
  const [bonusQuote, setBonusQuote] = useState<{ phone: string; balance: number } | null>(null)
  const [bonusPhone, setBonusPhone] = useState<string | null>(null)

  const [promoInput, setPromoInput] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<(PromoCode & { cartKey: string }) | null>(null)
  const [promoError, setPromoError] = useState('')
  const [applyingPromo, setApplyingPromo] = useState(false)
  const promoRequestId = useRef(0)
  const cartKey = JSON.stringify(items.map(i => [i.product.id, i.size, i.qty, i.price]))
  const activePromo = appliedPromo?.cartKey === cartKey ? appliedPromo : null

  async function applyPromo() {
    const requestId = ++promoRequestId.current
    const requestedCart = cartKey
    setApplyingPromo(true)
    setPromoError('')
    try {
      const res = await fetch('/api/promocodes/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput, items: items.map(i => ({ productId: i.product.id, size: i.size, qty: i.qty })) }),
      })
      const data = await res.json()
      if (requestId !== promoRequestId.current || JSON.stringify(useCartStore.getState().items.map(i => [i.product.id, i.size, i.qty, i.price])) !== requestedCart) return
      if (!res.ok) throw new Error(data.error || 'Не удалось проверить промокод')
      if (data.subtotal !== subtotal) throw new Error('Стоимость товаров изменилась. Обновите корзину.')
      setAppliedPromo({ ...data, id: 0, name: '', isActive: true, cartKey: requestedCart })
      setPromoInput(data.code)
      setUseBonuses(false)
    } catch (error) {
      if (requestId === promoRequestId.current) {
        setAppliedPromo(null)
        setPromoError(error instanceof Error ? error.message : 'Не удалось проверить промокод')
      }
    } finally {
      if (requestId === promoRequestId.current) setApplyingPromo(false)
    }
  }

  function removePromo() {
    promoRequestId.current++
    setApplyingPromo(false)
    setAppliedPromo(null)
    setPromoInput('')
    setPromoError('')
  }

  // Подсказки адреса
  type Suggestion = { fullname: string; description: string; street: string; house: string }
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestRef = useRef<HTMLDivElement>(null)
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSuggestions = useCallback((q: string) => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current)
    if (q.length < 3) { setSuggestions([]); return }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address-suggest?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setSuggestions(data)
      } catch { setSuggestions([]) }
    }, 350)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const [addr, setAddr] = useState({
    street: '',
    house: '',
    apt: '',
    entrance: '',
    intercom: '',
    courierNote: '',
  })

  const [form, setForm] = useState({
    recipientName: '',
    recipientPhone: '',
    deliveryDate: getMinDeliveryDate(),
    deliveryTime: getDeliveryTimeSlots()[0],
    cardText: '',
    photoReport: false,
  })

  const availableTimeSlots = useMemo(
    () => getDeliveryTimeSlots(form.deliveryDate),
    [form.deliveryDate]
  )

  const effectiveDeliveryTime = availableTimeSlots.includes(form.deliveryTime) ? form.deliveryTime : (availableTimeSlots[0] ?? '')
  const bonusBalance = bonusQuote?.phone === form.recipientPhone && form.recipientPhone.length === 10 ? bonusQuote.balance : null
  const useBonuses = bonusPhone === form.recipientPhone
  function setUseBonuses(value: boolean) { setBonusPhone(value ? form.recipientPhone : null) }

  const calcAddress = useMemo(() => {
    if (selfPickup || !addr.street || !addr.house) return ''
    return `${addr.street}, ${addr.house}`
  }, [selfPickup, addr.street, addr.house])

  const fullAddress = useMemo(() => {
    return [
      addr.street,
      addr.house && `д. ${addr.house}`,
      addr.apt && `кв. ${addr.apt}`,
      addr.entrance && `подъезд ${addr.entrance}`,
      addr.intercom && `домофон ${addr.intercom}`,
    ].filter(Boolean).join(', ')
  }, [addr])

  const deliveryCost = deliveryQuote?.address === calcAddress ? deliveryQuote.price : null
  const subtotal = total()
  const shipping = selfPickup ? 0 : (deliveryCost ?? null)
  const orderTotal = subtotal + (shipping ?? 0)
  const promoDiscount = activePromo ? calculatePromoDiscount(activePromo, subtotal) : 0
  const bonusDiscount = (!activePromo && useBonuses && bonusBalance && shipping !== null)
    ? Math.min(bonusBalance, orderTotal)
    : 0
  const finalTotal = Math.max(0, orderTotal - promoDiscount - bonusDiscount)

  // Загружаем баланс бонусов при вводе телефона
  useEffect(() => {
    const phone = form.recipientPhone.replace(/\D/g, '')
    if (phone.length < 10 || phone.length > 10) {
      return
    }
    const t = setTimeout(() => {
      fetch(`/api/account/bonuses?phone=${encodeURIComponent(phone)}`)
        .then(r => r.json())
        .then(d => setBonusQuote({ phone: form.recipientPhone, balance: d.bonuses ?? 0 }))
        .catch(() => setBonusQuote(null))
    }, 800)
    return () => clearTimeout(t)
  }, [form.recipientPhone])

  // Расчёт стоимости доставки
  useEffect(() => {
    if (!calcAddress) {
      return
    }
    const timeout = setTimeout(async () => {
      setLoadingCost(true)
      try {
        const res = await fetch('/api/delivery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: calcAddress }),
        })
        const data = await res.json()
        setDeliveryQuote({ address: calcAddress, price: data.price ?? null })
      } catch {
        setDeliveryQuote({ address: calcAddress, price: null })
      } finally {
        setLoadingCost(false)
      }
    }, 900)
    return () => clearTimeout(timeout)
  }, [calcAddress])

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')
    let navigated = false
    try {
      const pickupLoc = PICKUP_LOCATIONS.find(l => l.id === pickupLocationId)!
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          deliveryTime: effectiveDeliveryTime,
          paymentMethod: 'ONLINE',
          recipientPhone: `+7${form.recipientPhone}`,
          address: selfPickup ? `Самовывоз: ${pickupLoc.full}` : fullAddress,
          selfPickup,
          deliveryCost: selfPickup ? 0 : (deliveryCost ?? 0),
          comment: addr.courierNote || null,
          items: items.map(i => ({
            productId: i.product.id,
            sku: i.product.sku ?? '',
            name: i.product.name,
            image: i.product.images?.[0] ?? '',
            size: i.size,
            price: i.price,
            qty: i.qty,
          })),
          subtotal,
          total: finalTotal,
          bonusUsed: bonusDiscount,
          promoCode: activePromo?.code ?? null,
        }),
      })

      const text = await res.text()
      if (!res.ok) {
        let msg = `Ошибка сервера (${res.status})`
        try { msg = JSON.parse(text).error ?? msg } catch { msg = text.slice(0, 200) || msg }
        setSubmitError(msg)
        return
      }
      const data = JSON.parse(text)

      navigated = true
      if (data.paymentUrl) {
        // Корзину очистим на странице успеха — чтобы при неудачной оплате товары остались
        window.location.assign(data.paymentUrl)
      } else {
        clearCart()
        router.push(`/order-success?number=${data.number}`)
      }
    } catch (e) {
      setSubmitError('Не удалось создать заказ. Проверьте соединение и попробуйте снова.')
      console.error(e)
    } finally {
      if (!navigated) setSubmitting(false)
    }
  }

  const canProceed = form.recipientName.trim() && form.recipientPhone.length === 10 && effectiveDeliveryTime && (
    selfPickup || (addr.street && addr.house && !loadingCost && shipping !== null)
  )

  if (items.length === 0 && !submitting) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <p className="text-5xl mb-4">🌸</p>
        <p className="text-xl font-semibold mb-4">Корзина пуста</p>
        <Link href="/catalog" className="bg-rose-500 text-white px-6 py-3 rounded-full inline-block font-medium">
          Перейти в каталог
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8">Оформление заказа</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
        {/* Form */}
        <div className="md:col-span-2 space-y-5">
          {(
            <>
              {/* Получатель */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Получатель</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Имя получателя *</label>
                    <input className={inp} value={form.recipientName}
                      onChange={e => setForm({ ...form, recipientName: e.target.value })}
                      placeholder="Анна" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Телефон получателя *</label>
                    <div className="flex items-center border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-rose-300 overflow-hidden">
                      <span className="pl-4 pr-1 text-sm text-gray-500 bg-white select-none shrink-0">+7</span>
                      <input
                        className="flex-1 py-2.5 pr-4 text-sm bg-white focus:outline-none"
                        value={form.recipientPhone}
                        onChange={e => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                          setForm({ ...form, recipientPhone: digits })
                        }}
                        placeholder="9001234567"
                        type="tel"
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                </div>

                {/* Бонусы */}
                {bonusBalance !== null && bonusBalance > 0 && (
                  <label className="flex items-center gap-3 mt-3 cursor-pointer bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <input type="checkbox" className="accent-rose-500 w-4 h-4 shrink-0"
                      checked={useBonuses}
                      onChange={e => { setUseBonuses(e.target.checked); if (e.target.checked) removePromo() }} />
                    <span className="text-sm">
                      <span className="font-semibold text-amber-700">🎁 У вас {bonusBalance.toLocaleString('ru')} бонусов</span>
                      <span className="text-gray-500"> — списать как скидку {Math.min(bonusBalance, orderTotal).toLocaleString('ru')} ₽</span>
                    </span>
                  </label>
                )}
              </div>

              {/* Способ получения */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setSelfPickup(false)}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    !selfPickup ? 'bg-rose-500 text-white border-rose-500' : 'border-gray-300 text-gray-600 hover:border-rose-200'
                  }`}>
                  🚗 Доставка курьером
                </button>
                <button onClick={() => setSelfPickup(true)}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    selfPickup ? 'bg-rose-500 text-white border-rose-500' : 'border-gray-300 text-gray-600 hover:border-rose-200'
                  }`}>
                  🏪 Самовывоз (бесплатно)
                </button>
              </div>

              {/* Адрес доставки */}
              {!selfPickup && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Адрес доставки</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 relative" ref={suggestRef}>
                      <label className="block text-xs text-gray-500 mb-1">Улица *</label>
                      <input
                        className={inp}
                        value={addr.street}
                        autoComplete="off"
                        placeholder="Проспект Большевиков"
                        onChange={e => {
                          setAddr({ ...addr, street: e.target.value, house: addr.house })
                          fetchSuggestions(e.target.value)
                          setShowSuggestions(true)
                        }}
                        onFocus={() => { if (suggestions.length) setShowSuggestions(true) }}
                      />
                      {showSuggestions && suggestions.length > 0 && (
                        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                          {suggestions.map((s, i) => (
                            <li
                              key={i}
                              className="px-4 py-2.5 cursor-pointer hover:bg-rose-50 text-sm border-b border-gray-50 last:border-0"
                              onMouseDown={e => {
                                e.preventDefault()
                                setAddr(a => ({ ...a, street: s.street, house: s.house || a.house }))
                                setShowSuggestions(false)
                                setSuggestions([])
                              }}
                            >
                              <span className="text-gray-800">{s.street}{s.house ? `, ${s.house}` : ''}</span>
                              <span className="text-gray-400 text-xs ml-1">— {s.description}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Дом *</label>
                      <input className={inp} value={addr.house}
                        onChange={e => setAddr({ ...addr, house: e.target.value })}
                        placeholder="33" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Квартира</label>
                      <input className={inp} value={addr.apt}
                        onChange={e => setAddr({ ...addr, apt: e.target.value })}
                        placeholder="12" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Подъезд</label>
                      <input className={inp} value={addr.entrance}
                        onChange={e => setAddr({ ...addr, entrance: e.target.value })}
                        placeholder="2" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Домофон</label>
                      <input className={inp} value={addr.intercom}
                        onChange={e => setAddr({ ...addr, intercom: e.target.value })}
                        placeholder="12#" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Комментарий для курьера</label>
                    <input className={inp} value={addr.courierNote}
                      onChange={e => setAddr({ ...addr, courierNote: e.target.value })}
                      placeholder="Позвонить за 15 минут, не звонить в дверь" />
                  </div>
                  {addr.street && addr.house && (
                    <div className="text-sm py-2">
                      {loadingCost ? (
                        <span className="text-gray-400">Рассчитываем стоимость доставки…</span>
                      ) : deliveryCost !== null ? (
                        <span className="text-rose-500 font-medium">
                          Стоимость доставки: {formatPrice(deliveryCost)}
                        </span>
                      ) : (
                        <span className="text-gray-400">Не удалось рассчитать — уточните адрес</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Самовывоз */}
              {selfPickup && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Выберите адрес самовывоза</p>
                  {PICKUP_LOCATIONS.map(loc => (
                    <button key={loc.id} type="button"
                      onClick={() => setPickupLocationId(loc.id)}
                      className={`w-full text-left rounded-xl border p-4 transition-colors ${
                        pickupLocationId === loc.id
                          ? 'border-rose-400 bg-rose-50'
                          : 'border-gray-200 hover:border-rose-200'
                      }`}>
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          pickupLocationId === loc.id ? 'border-rose-500' : 'border-gray-300'
                        }`}>
                          {pickupLocationId === loc.id && (
                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900 flex items-center gap-1.5">
                            <MapPin size={13} className="text-rose-400" />
                            {loc.name}
                          </p>
                          <p className="text-sm text-gray-700 mt-0.5">{loc.address}</p>
                          <p className="text-xs text-gray-400 mt-1 leading-relaxed">{loc.hint}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  <p className="text-xs text-gray-500 pt-1">Тел.: +7 (931) 991-28-39</p>
                </div>
              )}

              {/* Дата и время */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    {selfPickup ? 'Дата самовывоза *' : 'Дата доставки *'}
                  </label>
                  <input type="date" className={inp} value={form.deliveryDate}
                    min={getMinDeliveryDate()}
                    onChange={e => setForm({ ...form, deliveryDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    {selfPickup ? 'Время самовывоза *' : 'Время доставки *'}
                  </label>
                  <select className={inp} value={effectiveDeliveryTime}
                    onChange={e => setForm({ ...form, deliveryTime: e.target.value })}>
                    {availableTimeSlots.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Открытка */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Текст открытки</label>
                <textarea className={`${inp} resize-none`} rows={3}
                  value={form.cardText}
                  onChange={e => setForm({ ...form, cardText: e.target.value })}
                  placeholder="Текст, который напишем на открытке" />
              </div>

              <label className="flex items-center gap-3 text-sm cursor-pointer">
                <input type="checkbox" className="accent-rose-500 w-4 h-4"
                  checked={form.photoReport}
                  onChange={e => setForm({ ...form, photoReport: e.target.checked })} />
                Прислать фото букета перед отправкой
              </label>

              {!selfPickup && addr.street && addr.house && shipping === null && !loadingCost && (
                <p className="text-sm text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
                  Не удалось рассчитать стоимость доставки — уточните адрес
                </p>
              )}
              {submitError && (
                <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{submitError}</p>
              )}
              <button
                onClick={handleSubmit}
                disabled={!canProceed || submitting || applyingPromo}
                className="w-full bg-rose-500 text-white py-3.5 rounded-full font-semibold hover:bg-rose-600 transition-colors disabled:opacity-50">
                {submitting ? 'Обработка...' : loadingCost ? 'Рассчитываем доставку…' : finalTotal === 0 ? 'Оформить заказ' : 'Перейти к оплате'}
              </button>
            </>
          )}
        </div>

        {/* Order summary */}
        <div>
          <div className="bg-gray-50 rounded-2xl p-5 md:sticky md:top-24">
            <p className="font-semibold mb-4">Ваш заказ</p>
            <ul className="space-y-3 mb-4">
              {items.map(item => (
                <li key={`${item.product.id}-${item.size}`} className="flex gap-3">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {item.product.images[0] && (
                      <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-400">×{item.qty}, размер {item.size}</p>
                    <p className="text-sm font-semibold">{formatPrice(item.price * item.qty)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t py-4">
              <label htmlFor="checkout-promo" className="block text-sm font-medium mb-2">Промокод</label>
              <div className="flex gap-2">
                <input id="checkout-promo" className={`${inp} min-w-0 uppercase`} value={promoInput}
                  maxLength={40} placeholder="Введите промокод" autoComplete="off" disabled={submitting}
                  aria-describedby="promo-feedback"
                  onChange={e => {
                    promoRequestId.current++
                    setApplyingPromo(false)
                    setAppliedPromo(null)
                    setPromoError('')
                    setPromoInput(e.target.value)
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && promoInput.trim() && !applyingPromo) { e.preventDefault(); applyPromo() } }} />
                {activePromo ? (
                  <button type="button" onClick={removePromo} disabled={submitting}
                    className="text-sm text-gray-500 px-2 hover:text-rose-600">Убрать</button>
                ) : (
                  <button type="button" onClick={applyPromo} disabled={!promoInput.trim() || applyingPromo || submitting}
                    className="rounded-xl bg-rose-500 text-white px-3 text-sm disabled:opacity-50 shrink-0">
                    {applyingPromo ? 'Проверка…' : 'Применить'}
                  </button>
                )}
              </div>
              <div id="promo-feedback" aria-live="polite" className="text-xs mt-2">
                {promoError && <p role="alert" className="text-red-600">{promoError}</p>}
                {activePromo && <p className="text-green-700">Промокод {activePromo.code} применён: −{formatPrice(promoDiscount)}</p>}
                {appliedPromo && !activePromo && <p className="text-amber-700">Корзина изменилась — примените промокод повторно.</p>}
                <p className="text-gray-500 mt-1">Можно использовать промокод или бонусы. Скидка по промокоду действует на товары, без доставки.</p>
              </div>
            </div>
            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Товары</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Доставка</span>
                <span>
                  {selfPickup ? 'Бесплатно'
                    : loadingCost ? '…'
                    : shipping !== null ? formatPrice(shipping)
                    : 'Укажите адрес'}
                </span>
              </div>
              {activePromo && (
                <div className="flex justify-between text-rose-600 font-medium gap-2">
                  <span>Промокод {activePromo.code}</span>
                  <span className="shrink-0">−{formatPrice(promoDiscount)}</span>
                </div>
              )}
              {bonusDiscount > 0 && (
                <div className="flex justify-between text-amber-600 font-medium">
                  <span>🎁 Бонусы</span>
                  <span>−{formatPrice(bonusDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                <span>Итого</span>
                <span className="text-rose-500">
                  {formatPrice(finalTotal)}
                  {shipping === null && !selfPickup && <span className="text-xs font-normal text-gray-400 ml-1">+ доставка</span>}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
