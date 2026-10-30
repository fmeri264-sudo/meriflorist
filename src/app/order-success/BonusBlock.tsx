'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@/store/cart'

const MAX_BOT_LINK = 'https://max.ru/id422500013982_1_bot'

export default function BonusBlock({ numberFromUrl }: { numberFromUrl?: string }) {
  const clearCart = useCartStore(s => s.clearCart)
  const [orderNumber, setOrderNumber] = useState<string | null>(numberFromUrl ?? null)
  const [copied, setCopied] = useState(false)
  const [bonusPercent, setBonusPercent] = useState<number | null>(null)

  useEffect(() => {
    let number = numberFromUrl ?? null
    if (!number) {
      const saved = localStorage.getItem('lastOrderNumber')
      if (saved) number = saved
    }
    localStorage.removeItem('lastOrderNumber')
    if (number) setOrderNumber(number)
    clearCart()

    // Загружаем актуальный % бонуса из первого активного правила
    fetch('/api/admin/bonuses')
      .then(r => r.json())
      .then((rules: { bonusPercent: number; isActive: boolean; conditionType: string }[]) => {
        const active = rules.find(r => r.isActive && r.conditionType === 'always')
          ?? rules.find(r => r.isActive)
        if (active) setBonusPercent(active.bonusPercent)
      })
      .catch(() => null)
  }, [])

  // Последние 4 цифры номера заказа — короткий код для бота
  const shortCode = orderNumber ? orderNumber.slice(-4) : null

  function copyCode() {
    if (!shortCode) return
    navigator.clipboard.writeText(shortCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 rounded-2xl p-6 mb-6 text-left">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🎁</span>
        <p className="font-bold text-gray-900 text-lg">Получи бонус</p>
      </div>
      {bonusPercent !== null && (
        <p className="text-sm text-gray-600 mb-4">
          <strong>{bonusPercent}% от суммы заказа</strong> вернётся вам бонусами — используйте при следующей покупке.
        </p>
      )}

      {shortCode ? (
        <>
          <p className="text-xs text-gray-500 mb-2">
            Ваш код для получения бонуса:
          </p>
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-4xl font-bold tracking-widest text-rose-600 bg-white border-2 border-rose-200 rounded-xl px-5 py-3 select-all">
              {shortCode}
            </span>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 px-4 py-2 rounded-xl text-sm font-medium transition"
            >
              {copied ? '✓ Скопировано' : '📋 Скопировать'}
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-1">
            1. Нажмите кнопку ниже — откроется бот в MAX
          </p>
          <p className="text-sm text-gray-600 mb-4">
            2. Отправьте боту этот код <strong>{shortCode}</strong> — бонусы начислятся сразу
          </p>
        </>
      ) : (
        <p className="text-xs text-gray-400 mb-4">
          Откройте бота в MAX и следуйте инструкциям.
        </p>
      )}

      <a
        href={MAX_BOT_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-xl font-semibold text-sm transition shadow-sm"
        style={{ backgroundColor: '#7C3AED' }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#6D28D9')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#7C3AED')}
      >
        <svg viewBox="0 0 42 44" className="w-5 h-5 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M21.4234 0C33.0451 0 42.1572 9.42783 42.1572 21.0579C42.1572 32.688 32.7552 41.8841 21.5335 41.8841C17.5524 41.8841 15.6204 41.3232 12.5139 39.1235C12.3004 38.9723 12.0062 39.0134 11.8272 39.2043C9.43522 41.7558 3.31317 43.5454 3.03275 40.0629C3.03275 33.9928 2.89573e-05 30.0472 0 20.942C0 8.9892 9.80174 0.000105742 21.4234 0ZM21.7498 10.3647C16.2345 10.0754 11.9306 13.9028 10.9815 19.8934C10.1955 24.8543 11.5891 30.899 12.781 31.2033C13.2866 31.3321 14.503 30.4018 15.388 29.5672C15.5544 29.4103 15.8062 29.384 16.0013 29.5033C17.381 30.347 18.9433 30.981 20.6654 31.0713C26.3275 31.3682 31.345 26.9362 31.6415 21.2731C31.938 15.61 27.4119 10.6617 21.7498 10.3647Z" fill="white" />
        </svg>
        Открыть бот в MAX
      </a>
    </div>
  )
}
