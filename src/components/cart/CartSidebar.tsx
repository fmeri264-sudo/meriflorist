'use client'

import { useCartStore } from '@/store/cart'
import { X, Minus, Plus, ShoppingBag } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'

export default function CartSidebar() {
  const { items, isOpen, closeCart, removeItem, updateQty, total } = useCartStore()

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={closeCart}
      />

      {/* Sidebar */}
      <aside className="fixed right-0 top-0 h-full w-full max-w-xs sm:max-w-sm bg-white z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-bold">Корзина</h2>
          <button onClick={closeCart} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center text-gray-500">
            <ShoppingBag className="w-14 h-14 text-gray-300" />
            <p>Корзина пуста</p>
            <Link
              href="/catalog"
              onClick={closeCart}
              className="bg-rose-500 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-rose-600"
            >
              Перейти в каталог
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto divide-y">
              {items.map((item) => (
                <li key={`${item.product.id}-${item.size}`} className="flex gap-3 p-4">
                  <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                    {item.product.images[0] && (
                      <Image
                        src={item.product.images[0]}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-500">Размер: {item.size}</p>
                    <p className="text-sm font-semibold text-rose-500 mt-1">
                      {formatPrice(item.price)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() =>
                          updateQty(item.product.id, item.size, item.qty - 1)
                        }
                        className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-gray-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm w-5 text-center">{item.qty}</span>
                      <button
                        onClick={() =>
                          updateQty(item.product.id, item.size, item.qty + 1)
                        }
                        className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-gray-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id, item.size)}
                    className="self-start p-1 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="border-t px-5 py-4 space-y-3">
              <div className="flex justify-between font-semibold text-lg">
                <span>Итого</span>
                <span className="text-rose-500">{formatPrice(total())}</span>
              </div>
              <p className="text-xs text-gray-500">Стоимость доставки рассчитается при оформлении</p>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="block w-full bg-rose-500 text-white text-center py-3 rounded-full font-semibold hover:bg-rose-600 transition-colors"
              >
                Оформить заказ
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
