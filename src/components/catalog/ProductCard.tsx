'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingCart } from 'lucide-react'
import { Product } from '@/types'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/store/cart'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface Props {
  product: Product
  variants?: Product[]
}

export default function ProductCard({ product, variants = [] }: Props) {
  const { addItem } = useCartStore()
  const [isFav, setIsFav] = useState(false)

  useEffect(() => {
    const favs: number[] = JSON.parse(localStorage.getItem('favorites') || '[]')
    setIsFav(favs.includes(product.id))
  }, [product.id])

  function toggleFav(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const favs: number[] = JSON.parse(localStorage.getItem('favorites') || '[]')
    const next = isFav ? favs.filter(id => id !== product.id) : [...favs, product.id]
    localStorage.setItem('favorites', JSON.stringify(next))
    setIsFav(!isFav)
  }

  const hasDims = product.width || product.height

  return (
    <div className="mary-product group relative overflow-hidden">
      {/* Badges */}
      <div className="absolute top-3 left-3 flex gap-2 z-10">
        {product.isHit && (
          <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Хит</span>
        )}
        {product.isNew && (
          <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Новинка</span>
        )}
      </div>

      {/* Wishlist */}
      <button
        aria-label={isFav ? 'Удалить из избранного' : 'Добавить в избранное'}
        onClick={toggleFav}
        className={cn(
          'absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow-sm transition-colors',
          isFav ? 'text-rose-500' : 'text-gray-400 hover:text-rose-500'
        )}
      >
        <Heart className={cn('w-4 h-4', isFav && 'fill-rose-500')} />
      </button>

      {/* Image */}
      <Link href={`/catalog/${product.slug}`}>
        <div className="relative w-full aspect-[3/4] bg-gray-50 overflow-hidden">
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-5xl">
              🌸
            </div>
          )}
          {/* Dimension badge */}
          {hasDims && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded-lg backdrop-blur-sm">
              {product.width && product.height
                ? `${product.width} × ${product.height} см`
                : product.width
                ? `Ш ${product.width} см`
                : `В ${product.height} см`}
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="p-3 sm:p-4">
        <Link href={`/catalog/${product.slug}`}>
          <h3 className="font-medium text-base text-gray-900 line-clamp-2 min-h-12 hover:text-rose-500 transition-colors mb-1">
            {product.name}
          </h3>
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
          <span className="text-base font-bold text-gray-900 whitespace-nowrap">{formatPrice(product.price)}</span>
          <button
            onClick={() => addItem(product, 'M')}
            className={cn(
              'flex items-center gap-1 bg-rose-500 text-white px-3 py-2.5 rounded-md text-sm font-medium hover:bg-rose-600 transition-colors whitespace-nowrap',
              !product.inStock && 'opacity-50 cursor-not-allowed'
            )}
            disabled={!product.inStock}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {product.inStock ? 'В корзину' : 'Нет в наличии'}
          </button>
        </div>
      </div>
    </div>
  )
}
