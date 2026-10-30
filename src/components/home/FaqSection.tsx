'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const FAQ = [
  {
    q: 'А если цветы завянут быстро?',
    a: 'Мы даём гарантию свежести 48 часов. Если цветы завянут раньше — заменим букет или вернём деньги без лишних вопросов.',
  },
  {
    q: 'Можно ли поменять букет?',
    a: 'Да, до момента передачи флористу в сборку. Напишите нам в WhatsApp или Telegram сразу после оформления.',
  },
  {
    q: 'Что если получателя нет дома?',
    a: 'Курьер свяжется с получателем за 15 минут до прибытия. Если никто не открыл — оставим в безопасном месте или договоримся о повторной доставке.',
  },
  {
    q: 'Можно заказать доставку к точному времени?',
    a: 'Да, выбирайте 2-часовой интервал при оформлении. Для точного времени — свяжитесь с нами отдельно.',
  },
  {
    q: 'Как оплатить?',
    a: 'Онлайн через Робокассу (Visa, MasterCard, Мир, СБП), Apple Pay / Google Pay — или наличными курьеру.',
  },
  {
    q: 'Есть ли самовывоз?',
    a: 'Да, самовывоз бесплатный. Адрес и время работы — на странице «Контакты».',
  },
]

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-10">Частые вопросы</h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                className="w-full flex justify-between items-center px-6 py-4 text-left"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-medium text-gray-900">{item.q}</span>
                <ChevronDown
                  className={cn('w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-4', {
                    'rotate-180': open === i,
                  })}
                />
              </button>
              {open === i && (
                <p className="px-6 pb-4 text-gray-600 text-sm leading-relaxed">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
