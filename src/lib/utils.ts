import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₽'
}

export function generateOrderNumber(): string {
  const date = new Date()
  const prefix = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `MF-${prefix}-${random}`
}

export function getDeliveryTimeSlots(date?: string): string[] {
  const slots = [
    '10:00 – 12:00',
    '12:00 – 14:00',
    '14:00 – 16:00',
    '16:00 – 18:00',
    '18:00 – 20:00',
    '20:00 – 22:00',
  ]

  // Для доставки сегодня показываем только интервалы, начинающиеся
  // не раньше чем через два часа после текущего момента.
  if (!date) return slots
  const today = new Date()
  const selected = new Date(`${date}T00:00:00`)
  if (Number.isNaN(selected.getTime()) || selected.toDateString() !== today.toDateString()) return slots

  const minStart = today.getHours() * 60 + today.getMinutes() + 120
  return slots.filter(slot => {
    const [hours, minutes] = slot.slice(0, 5).split(':').map(Number)
    return hours * 60 + minutes >= minStart
  })
}

export function getMinDeliveryDate(): string {
  const now = new Date()
  now.setHours(now.getHours() + 2)
  return now.toISOString().split('T')[0]
}

export function phoneMask(value: string): string {
  const digits = value.replace(/\D/g, '')
  const match = digits.match(/^(\d{0,1})(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/)
  if (!match) return value
  let result = ''
  if (match[1]) result += '+7'
  if (match[2]) result += ` (${match[2]}`
  if (match[2]?.length === 3) result += ')'
  if (match[3]) result += ` ${match[3]}`
  if (match[4]) result += `-${match[4]}`
  if (match[5]) result += `-${match[5]}`
  return result
}
