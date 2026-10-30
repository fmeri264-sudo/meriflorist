import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import BonusBlock from './BonusBlock'

interface Props {
  searchParams: Promise<{ number?: string }>
}

export default async function OrderSuccessPage({ searchParams }: Props) {
  const { number } = await searchParams

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
      <h1 className="text-3xl font-bold mb-3">Заказ оформлен!</h1>
      {number && (
        <p className="text-gray-500 mb-2">Номер заказа: <strong>#{number}</strong></p>
      )}
      <p className="text-gray-600 mb-8">
        Мы пришлём фото букета перед отправкой.
      </p>

      <BonusBlock numberFromUrl={number} />

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/catalog"
          className="border border-gray-300 text-gray-700 px-6 py-3 rounded-full font-medium hover:bg-gray-50 transition"
        >
          Продолжить покупки
        </Link>
      </div>
    </div>
  )
}
