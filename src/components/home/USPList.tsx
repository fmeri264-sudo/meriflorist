import { Clock, Camera, BookOpen } from 'lucide-react'

const USP = [
  { icon: Clock, text: 'Доставка сегодня от 2 часов' },
  { icon: Camera, text: 'Фото букета перед отправкой' },
  { icon: BookOpen, text: 'Бесплатная открытка к букету' },
]

export default function USPList() {
  return (
    <div className="mary-benefits">
      {USP.map(({ icon: Icon, text }) => (
        <div key={text} className="flex items-center justify-center gap-3 text-sm text-gray-700">
          <Icon className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span>{text}</span>
        </div>
      ))}
    </div>
  )
}
