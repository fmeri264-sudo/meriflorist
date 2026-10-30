import { Clock, Camera, RefreshCw, Gift, BookOpen } from 'lucide-react'

const USP = [
  { icon: Clock, text: 'Доставка сегодня от 2 часов' },
  { icon: Camera, text: 'Фото букета перед отправкой' },
  { icon: RefreshCw, text: 'Бесплатная замена при браке' },
  { icon: Gift, text: 'Бонусная программа' },
  { icon: BookOpen, text: 'Бесплатная открытка к букету' },
]

export default function USPList() {
  return (
    <div className="flex gap-1.5 overflow-x-auto mb-1 pb-0.5 scrollbar-hide -mx-4 px-4">
      {USP.map(({ icon: Icon, text }) => (
        <div key={text} className="flex items-center gap-1.5 bg-white/80 rounded-full px-2.5 py-0.5 shadow-sm text-xs text-gray-700 whitespace-nowrap flex-shrink-0">
          <Icon className="w-3 h-3 text-rose-500 flex-shrink-0" />
          <span>{text}</span>
        </div>
      ))}
    </div>
  )
}
