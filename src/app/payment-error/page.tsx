import Link from 'next/link'
import { XCircle } from 'lucide-react'

interface Props {
  searchParams: Promise<{ number?: string }>
}

export default async function PaymentErrorPage({ searchParams }: Props) {
  const { number } = await searchParams

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <XCircle className="w-20 h-20 text-red-400 mx-auto mb-6" />
      <h1 className="text-3xl font-bold mb-3">Не удалось оплатить</h1>
      {number && (
        <p className="text-gray-500 mb-2">Заказ <strong>#{number}</strong> сохранён</p>
      )}
      <p className="text-gray-600 mb-2">
        Платёж не прошёл — заказ остался в системе.
      </p>
      <p className="text-gray-500 text-sm mb-10">
        Попробуйте ещё раз или выберите другой способ оплаты.
        Если проблема повторяется — позвоните нам.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {number && (
          <Link
            href={`/account`}
            className="bg-rose-500 text-white px-6 py-3 rounded-full font-medium hover:bg-rose-600 transition"
          >
            Повторить оплату
          </Link>
        )}
        <Link
          href="/catalog"
          className="border border-gray-300 text-gray-700 px-6 py-3 rounded-full font-medium hover:bg-gray-50 transition"
        >
          Вернуться в каталог
        </Link>
      </div>
    </div>
  )
}
