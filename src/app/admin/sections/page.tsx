'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Check, X, Pin, PinOff } from 'lucide-react'
import Image from 'next/image'
import { HOME_SELECTION_ID, HOME_SELECTION_LIMIT } from '@/lib/home-selection'
import Link from 'next/link'

interface Section {
  id: number; title: string; subtitle: string | null; type: string
  bannerUrl: string | null; linkUrl: string | null; linkText: string | null
  visible: boolean; sort: number; config: Record<string, unknown>
}

interface Product {
  id: number; name: string; price: number; images: string[]
  sectionIds: number[]
  isAddon: boolean; inStock: boolean; isVisible: boolean
}

const TYPE_LABELS: Record<string, string> = {
  advantages: 'Преимущества', products: 'Товары', bouquet_of_day: 'Букет дня',
  reviews: 'Отзывы', blog: 'Блог / Акции',
}

export default function AdminSectionsPage() {
  const [sections, setSections] = useState<Section[]>([])
  const [editing, setEditing] = useState<Section | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Выбор товаров для секции
  const [pickingSection, setPickingSection] = useState<Section | null>(null)
  const [poolProducts, setPoolProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoadError('')
      const [res, selectionRes] = await Promise.all([fetch('/api/admin/sections'), fetch('/api/admin/home-selection')])
      if (!res.ok || !selectionRes.ok) throw new Error('Не удалось загрузить блоки')
      setSections([await selectionRes.json(), ...await res.json()])
    } catch {
      setLoadError('Не удалось загрузить блоки. Обновите страницу.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function openPicker(s: Section) {
    setPickingSection(s)
    setSearch('')
    setLoadingProducts(true)
    const res = await fetch(`/api/admin/products?limit=1000`)
    const data = await res.json()
    const all: Product[] = Array.isArray(data) ? data : (data.products ?? [])
    // Для управляемых блоков можно выбрать любой товар, независимо от его
    // текущей привязки к секциям главной страницы.
    setPoolProducts(s.id === HOME_SELECTION_ID ? all.filter(p => !p.isAddon && ((p.inStock && p.isVisible) || getPinned(s).includes(p.id))) : all)
    setLoadingProducts(false)
  }

  // pinnedProductIds хранятся в config секции
  function getPinned(s: Section): number[] {
    return (s.config?.pinnedProductIds as number[]) ?? []
  }

  async function updateSection(section: Section, data: object) {
    const response = await fetch(section.id === HOME_SELECTION_ID ? '/api/admin/home-selection' : `/api/admin/sections/${section.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    })
    if (!response.ok) {
      const result = await response.json().catch(() => ({}))
      alert(result.error ?? 'Не удалось сохранить блок.')
      return false
    }
    return true
  }

  async function togglePin(product: Product) {
    if (!pickingSection) return
    const current = getPinned(pickingSection)
    const isPinned = current.includes(product.id)
    if (pickingSection.id === HOME_SELECTION_ID && !isPinned && current.length >= HOME_SELECTION_LIMIT) {
      alert('В «Выборе Мэри» можно выбрать только 4 товара. Сначала снимите выбор с одного из товаров.')
      return
    }
    setSaving(true)
    const updated = isPinned ? current.filter(id => id !== product.id) : [...current, product.id]

    try {
      if (!await updateSection(pickingSection, { config: { ...pickingSection.config, pinnedProductIds: updated } })) return
      setPickingSection(prev => prev ? { ...prev, config: { ...prev.config, pinnedProductIds: updated } } : null)
      setSections(prev => prev.map(s => s.id === pickingSection.id
        ? { ...s, config: { ...s.config, pinnedProductIds: updated } }
        : s
      ))
    } catch {
      alert('Не удалось связаться с сервером.')
    } finally {
      setSaving(false)
    }
  }

  async function toggle(s: Section) {
    if (!await updateSection(s, { visible: !s.visible })) return
    load()
  }

  async function move(s: Section, dir: -1 | 1) {
    await fetch(`/api/admin/sections/${s.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sort: s.sort + dir }),
    })
    load()
  }

  async function remove(id: number, title: string) {
    if (!confirm(`Удалить блок «${title}»?`)) return
    await fetch(`/api/admin/sections/${id}`, { method: 'DELETE' })
    load()
  }

  async function saveEdit() {
    if (!editing) return
    const limit = Number(editing.config?.limit) || null
    if (!await updateSection(editing, {
      title: editing.title, subtitle: editing.subtitle,
      bannerUrl: editing.bannerUrl, linkUrl: editing.linkUrl, linkText: editing.linkText,
      config: { ...editing.config, limit: editing.id === HOME_SELECTION_ID ? 4 : limit ?? 0 },
    })) return
    setEditing(null)
    load()
  }

  async function addSection() {
    await fetch('/api/admin/sections', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Новый блок', type: 'products', sort: sections.length, visible: false, config: {} }),
    })
    load()
  }

  const isProductSection = (s: Section) => !['advantages', 'reviews', 'blog'].includes(s.type)

  const filtered = poolProducts.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Блоки главной страницы</h1>
        <Link href="/admin/settings#hero-banner" className="inline-flex my-4 text-rose-700 underline underline-offset-4">Главный баннер — фото, текст и предпросмотр →</Link>
        <button onClick={addSection}
          className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          <Plus size={16} /> Добавить блок
        </button>
      </div>

      {loadError && <p role="alert" className="text-red-600 mb-4">{loadError}</p>}
      {loading ? <div className="text-gray-400">Загрузка...</div> : (
        <div className="space-y-2">
          {sections.sort((a, b) => a.sort - b.sort).map(s => (
            <div key={s.id} className={`bg-white rounded-xl border ${s.visible ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
              {editing?.id === s.id ? (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Заголовок</label>
                      <input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Подзаголовок</label>
                      <input value={editing.subtitle ?? ''} onChange={e => setEditing({ ...editing, subtitle: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
                    </div>
                    {s.id !== HOME_SELECTION_ID && <div>
                      <label className="text-xs text-gray-500 mb-1 block">URL баннера (фото)</label>
                      <input value={editing.bannerUrl ?? ''} onChange={e => setEditing({ ...editing, bannerUrl: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                        placeholder="https://..." />
                    </div>}
                    {s.id !== HOME_SELECTION_ID && <div>
                      <label className="text-xs text-gray-500 mb-1 block">Ссылка кнопки</label>
                      <input value={editing.linkUrl ?? ''} onChange={e => setEditing({ ...editing, linkUrl: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                        placeholder="/catalog" />
                    </div>}
                    {isProductSection(s) && s.id !== HOME_SELECTION_ID && (
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Макс. карточек (0 = все)</label>
                        <input type="number" min={0}
                          value={(editing.config?.limit as number) ?? ''}
                          onChange={e => setEditing({ ...editing, config: { ...editing.config, limit: Number(e.target.value) || 0 } })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                          placeholder="8" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditing(null)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 rounded-lg"><X size={14} /> Отмена</button>
                    <button onClick={saveEdit} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-pink-500 text-white rounded-lg hover:bg-pink-600"><Check size={14} /> Сохранить</button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button disabled={s.id === HOME_SELECTION_ID} onClick={() => move(s, -1)} className="text-gray-300 hover:text-gray-600 transition"><ChevronUp size={14} /></button>
                    <button disabled={s.id === HOME_SELECTION_ID} onClick={() => move(s, 1)} className="text-gray-300 hover:text-gray-600 transition"><ChevronDown size={14} /></button>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{s.title}</p>
                    <p className="text-xs text-gray-400">
                      {s.id === HOME_SELECTION_ID ? 'Товары · максимум 4 · Все букеты → каталог' : TYPE_LABELS[s.type] ?? s.type}
                      {getPinned(s).length > 0 && <span className="text-pink-500"> · {getPinned(s).length} на главной</span>}
                    </p>
                  </div>
                  {isProductSection(s) && (
                    <button onClick={() => openPicker(s)}
                      title="Выбрать товары для главной"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-pink-600 bg-pink-50 hover:bg-pink-100 rounded-lg transition font-medium">
                      <Pin size={13} /> Товары
                    </button>
                  )}
                  <button onClick={() => toggle(s)} title={s.visible ? 'Скрыть' : 'Показать'}
                    className={`p-1.5 rounded-lg transition ${s.visible ? 'text-green-500 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-50'}`}>
                    {s.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button onClick={() => setEditing(s)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"><Pencil size={15} /></button>
                  <button disabled={s.id === HOME_SELECTION_ID} onClick={() => remove(s.id, s.title)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
                </div>
              )}

              {/* Панель выбора товаров */}
              {pickingSection?.id === s.id && (
                <div className="border-t border-gray-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Выберите товары для главной</p>
                      <p className="text-xs text-gray-400">
                        Пул: {poolProducts.length} товаров · Выбрано: {getPinned(pickingSection).length}{s.id === HOME_SELECTION_ID ? ' из 4. Порядок показа — порядок выбора.' : ''}
                      </p>
                    </div>
                    <button onClick={() => setPickingSection(null)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition">
                      <X size={16} />
                    </button>
                  </div>

                  {loadingProducts ? (
                    <p className="text-gray-400 text-sm text-center py-4">Загрузка...</p>
                  ) : poolProducts.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      <p>Нет товаров в пуле этого блока.</p>
                      <p className="text-xs mt-1">Откройте карточку товара → раздел «Блоки главной страницы» → отметьте этот блок.</p>
                    </div>
                  ) : (
                    <>
                      <input type="text" placeholder="Поиск по названию..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                      />
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
                        {filtered.map(p => {
                          const isPinned = getPinned(pickingSection).includes(p.id)
                          return (
                            <button key={p.id} onClick={() => togglePin(p)} disabled={saving}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-left transition ${
                                isPinned
                                  ? 'border-pink-400 bg-pink-50 hover:bg-pink-100'
                                  : 'border-gray-200 hover:border-pink-200 hover:bg-gray-50'
                              }`}>
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                {p.images?.[0] ? (
                                  <Image src={p.images[0]} alt={p.name} width={40} height={40} className="object-cover w-full h-full" unoptimized />
                                ) : <div className="w-full h-full bg-gray-100" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-900 truncate">{isPinned && s.id === HOME_SELECTION_ID ? `${getPinned(pickingSection).indexOf(p.id) + 1}. ` : ''}{p.name}</p>
                                <p className="text-xs text-gray-400">{p.price.toLocaleString('ru')} ₽</p>
                              </div>
                              {isPinned
                                ? <Check size={13} className="text-pink-500 shrink-0" />
                                : <Plus size={13} className="text-gray-300 shrink-0" />
                              }
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
