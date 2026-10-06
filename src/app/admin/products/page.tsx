'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Search, Pencil, Trash2, Star, Sparkles, Eye, EyeOff } from 'lucide-react'
import ExcelIO from '@/components/admin/ExcelIO'

interface Product {
  id: number
  name: string
  sku: string | null
  price: number
  images: string[]
  inStock: boolean
  isHit: boolean
  isNew: boolean
  isVisible: boolean
  category: { name: string } | null
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [inStock, setInStock] = useState('')
  const [isVisible, setIsVisible] = useState('')
  const [isHit, setIsHit] = useState('')
  const [isNew, setIsNew] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ search, page: String(page) })
    for (const [key, value] of Object.entries({ inStock, isVisible, isHit, isNew, categoryId })) {
      if (value) params.set(key, value)
    }
    const res = await fetch(`/api/admin/products?${params}`)
    const data = await res.json()
    setProducts(data.products)
    setTotal(data.total)
    setLoading(false)
  }, [search, page, inStock, isVisible, isHit, isNew, categoryId])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetch('/api/admin/categories').then(r => r.json()).then(data => {
      setCategories(Array.isArray(data) ? data : data.categories ?? [])
    }).catch(() => setCategories([]))
  }, [])

  async function deleteProduct(id: number, name: string) {
    if (!confirm(`Удалить «${name}»?`)) return
    await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    load()
  }

  async function toggleFlag(id: number, field: 'isHit' | 'isNew' | 'isVisible', current: boolean) {
    const product = products.find(p => p.id === id)!
    await fetch(`/api/admin/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...product, categoryId: (product as any).categoryId ?? product.category, [field]: !current }),
    })
    load()
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Товары</h1>
          <p className="text-gray-500 text-sm mt-0.5">Всего: {total}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ExcelIO type="products" onImported={load} />
          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Plus size={16} />
            Добавить товар
          </Link>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Поиск по артикулу или названию..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={inStock} onChange={e => { setInStock(e.target.value); setPage(1) }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white">
          <option value="">Наличие: все</option><option value="true">В наличии</option><option value="false">Нет в наличии</option>
        </select>
        <select value={isVisible} onChange={e => { setIsVisible(e.target.value); setPage(1) }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white">
          <option value="">Видимость: все</option><option value="true">Видна</option><option value="false">Не видна</option>
        </select>
        <select value={isHit} onChange={e => { setIsHit(e.target.value); setPage(1) }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white">
          <option value="">Хит: все</option><option value="true">Хит</option><option value="false">Не хит</option>
        </select>
        <select value={isNew} onChange={e => { setIsNew(e.target.value); setPage(1) }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white">
          <option value="">Новинка: все</option><option value="true">Новинка</option><option value="false">Не новинка</option>
        </select>
        <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1) }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white">
          <option value="">Категория: все</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Фото</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Название</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Артикул</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Категория</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Цена</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Хит</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Новинка</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">В наличии</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Видна</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    {p.images[0] && (
                      <Image
                        src={p.images[0]}
                        alt={p.name}
                        width={48}
                        height={48}
                        className="rounded-lg object-cover"
                        unoptimized
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900 line-clamp-2 max-w-xs">{p.name}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{p.sku ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">{p.price.toLocaleString('ru')} ₽</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleFlag(p.id, 'isHit', p.isHit)}
                      className={`transition ${p.isHit ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-300'}`}
                      title="Хит продаж"
                    >
                      <Star size={18} fill={p.isHit ? 'currentColor' : 'none'} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleFlag(p.id, 'isNew', p.isNew)}
                      className={`transition ${p.isNew ? 'text-pink-400' : 'text-gray-200 hover:text-pink-300'}`}
                      title="Новинка"
                    >
                      <Sparkles size={18} fill={p.isNew ? 'currentColor' : 'none'} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${p.inStock ? 'bg-green-400' : 'bg-gray-300'}`} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleFlag(p.id, 'isVisible', p.isVisible ?? true)}
                      className={`transition ${(p.isVisible ?? true) ? 'text-blue-400' : 'text-gray-200 hover:text-blue-300'}`}
                      title={(p.isVisible ?? true) ? 'Скрыть с витрины' : 'Показать на витрине'}
                    >
                      {(p.isVisible ?? true) ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Pencil size={15} />
                      </Link>
                      <button
                        onClick={() => deleteProduct(p.id, p.name)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition"
          >
            ← Назад
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition"
          >
            Вперёд →
          </button>
        </div>
      )}
    </div>
  )
}
