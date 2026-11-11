'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ArrowLeft, Upload } from 'lucide-react'
import { DISTRICTS } from '@/lib/districts'
import ProductImages from '@/components/admin/ProductImages'

interface Category {
  id: number
  name: string
}

interface Section {
  id: number
  title: string
  type: string
}

interface Occasion {
  id: number
  name: string
}

interface ProductData {
  name: string
  slug: string
  sku: string
  description: string
  composition: string
  price: string
  images: string[]
  video: string
  inStock: boolean
  isHit: boolean
  isNew: boolean
  isVisible: boolean
  tags: string
  categoryIds: number[]
  sectionIds: number[]
  occasionIds: number[]
  colors: string[]
  packaging: string
  flowerCount: string
  popularInDistricts: string[]
  width: string
  height: string
  groupId: string
  isAddon: boolean
  addonCategory: string
}

interface Props {
  initialData?: Partial<ProductData>
  productId?: number
}

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[аА]/g, 'a').replace(/[бБ]/g, 'b').replace(/[вВ]/g, 'v')
    .replace(/[гГ]/g, 'g').replace(/[дД]/g, 'd').replace(/[еЕёЁ]/g, 'e')
    .replace(/[жЖ]/g, 'zh').replace(/[зЗ]/g, 'z').replace(/[иИ]/g, 'i')
    .replace(/[йЙ]/g, 'y').replace(/[кК]/g, 'k').replace(/[лЛ]/g, 'l')
    .replace(/[мМ]/g, 'm').replace(/[нН]/g, 'n').replace(/[оО]/g, 'o')
    .replace(/[пП]/g, 'p').replace(/[рР]/g, 'r').replace(/[сС]/g, 's')
    .replace(/[тТ]/g, 't').replace(/[уУ]/g, 'u').replace(/[фФ]/g, 'f')
    .replace(/[хХ]/g, 'kh').replace(/[цЦ]/g, 'ts').replace(/[чЧ]/g, 'ch')
    .replace(/[шШ]/g, 'sh').replace(/[щЩ]/g, 'sch').replace(/[ъЪьЬ]/g, '')
    .replace(/[ыЫ]/g, 'y').replace(/[эЭ]/g, 'e').replace(/[юЮ]/g, 'yu')
    .replace(/[яЯ]/g, 'ya').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
}

const COLORS = [
  { value: 'красный', label: 'Красный', hex: '#ef4444' },
  { value: 'малиновый', label: 'Малиновый', hex: '#be185d' },
  { value: 'розовый', label: 'Розовый', hex: '#f472b6' },
  { value: 'бело-розовый', label: 'Бело-розовый', hex: 'linear-gradient(135deg,#fff 50%,#f472b6 50%)' },
  { value: 'белый', label: 'Белый', hex: '#f9fafb' },
  { value: 'желтый', label: 'Желтый', hex: '#facc15' },
  { value: 'оранжевый', label: 'Оранжевый', hex: '#fb923c' },
  { value: 'фиолетовый', label: 'Фиолетовый', hex: '#a855f7' },
  { value: 'кремовый', label: 'Кремовый', hex: '#fef3c7' },
  { value: 'зелено-розовый', label: 'Зелено-розовый', hex: 'linear-gradient(135deg,#4ade80 50%,#f472b6 50%)' },
  { value: 'смешанный', label: 'Смешанный', hex: 'linear-gradient(135deg,#f472b6,#facc15,#a855f7)' },
]

const PACKAGING_OPTIONS = ['Букет', 'Коробка', 'Корзина', 'Шляпная коробка', 'Пакет']

const SECTION_TYPE_LABELS: Record<string, string> = {
  advantages: 'Преимущества', products: 'Товары', bouquet_of_day: 'Букет дня',
  reviews: 'Отзывы', blog: 'Блог / Акции',
}

const empty: ProductData = {
  name: '', slug: '', sku: '', description: '', composition: '',
  price: '', images: [], video: '', inStock: true,
  isHit: false, isNew: false, isVisible: true, tags: '', categoryIds: [], sectionIds: [], occasionIds: [],
  colors: [], packaging: '', flowerCount: '', popularInDistricts: [],
  width: '', height: '', groupId: '', isAddon: false, addonCategory: '',
}

export default function ProductForm({ initialData, productId }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<ProductData>({ ...empty, ...initialData })
  const [categories, setCategories] = useState<Category[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [occasions, setOccasions] = useState<Occasion[]>([])
  const [newImage, setNewImage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/categories').then(r => r.ok ? r.json() : []).then(setCategories).catch(() => null)
    fetch('/api/admin/sections').then(r => r.ok ? r.json() : []).then(setSections).catch(() => null)
    fetch('/api/admin/occasions').then(r => r.ok ? r.json() : []).then(setOccasions).catch(() => null)
  }, [])

  function set(field: keyof ProductData, value: unknown) {
    setForm(f => ({ ...f, [field]: value }))
    if (field === 'name' && !productId) {
      setForm(f => ({ ...f, name: value as string, slug: slugify(value as string) }))
    }
  }

  function addImage() {
    const url = newImage.trim()
    if (!url) return
    setForm(f => ({ ...f, images: [...f.images, url] }))
    setNewImage('')
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    setUploadError('')
    const errors: string[] = []
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.url) {
          setForm(f => ({ ...f, images: [...f.images, data.url] }))
        } else {
          errors.push(data.error ?? file.name)
        }
      } catch {
        errors.push(file.name)
      }
    }
    if (errors.length) setUploadError(`Не загружено: ${errors.join(', ')}`)
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      ...form,
      price: Number(form.price),
      sku: form.sku.trim() || null,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      categoryId: form.categoryIds[0] ?? 0,
      categoryIds: form.categoryIds,
      sectionIds: form.sectionIds,
      occasionIds: form.occasionIds,
      colors: form.colors,
      packaging: form.packaging || null,
      flowerCount: form.flowerCount ? Number(form.flowerCount) : null,
      popularInDistricts: form.popularInDistricts,
      width: form.width ? Number(form.width) : null,
      height: form.height ? Number(form.height) : null,
      groupId: form.groupId.trim() || null,
      isAddon: form.isAddon,
      addonCategory: form.isAddon ? (form.addonCategory.trim() || null) : null,
      isVisible: form.isVisible,
    }

    const res = await fetch(
      productId ? `/api/admin/products/${productId}` : '/api/admin/products',
      {
        method: productId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )

    if (res.ok) {
      router.push('/admin/products')
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Ошибка сохранения')
    }
    setSaving(false)
  }

  return (
    <div className="p-6 max-w-3xl">
      <button
        onClick={() => router.push('/admin/products')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-6 transition"
      >
        <ArrowLeft size={16} /> Назад к товарам
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {productId ? 'Редактировать товар' : 'Новый товар'}
      </h1>

      <form onSubmit={save} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Основное</h2>

          <Field label="Название *">
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className={input} required placeholder="Букет из роз 25 штук" />
          </Field>

          <Field label="Slug (URL)">
            <input value={form.slug} onChange={e => set('slug', e.target.value)}
              className={input} placeholder="buket-iz-roz-25" />
          </Field>

          <Field label="Артикул meribuket.ru (SKU)">
            <input value={form.sku} onChange={e => set('sku', e.target.value)}
              className={input} placeholder="K0001 — для синхронизации остатков" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Цена (₽) *">
              <input type="number" value={form.price} onChange={e => set('price', e.target.value)}
                className={input} required min={0} placeholder="3500" />
            </Field>
            <Field label="Категории *">
              <div className="flex flex-wrap gap-2">
                {categories.map(c => {
                  const checked = form.categoryIds.includes(c.id)
                  return (
                    <label key={c.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition ${checked ? 'bg-pink-50 border-pink-400 text-pink-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <input type="checkbox" className="sr-only" checked={checked}
                        onChange={() => set('categoryIds', checked
                          ? form.categoryIds.filter(id => id !== c.id)
                          : [...form.categoryIds, c.id])} />
                      {c.name}
                    </label>
                  )
                })}
              </div>
              {form.categoryIds.length === 0 && <p className="text-xs text-red-500 mt-1">Выберите хотя бы одну категорию</p>}
            </Field>
          </div>

          <Field label="Описание">
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              className={input + ' resize-none'} rows={3} placeholder="Описание букета..." />
          </Field>

          <Field label="Состав">
            <textarea value={form.composition} onChange={e => set('composition', e.target.value)}
              className={input + ' resize-none'} rows={2} placeholder="25 роз, эвкалипт, упаковка..." />
          </Field>

          <Field label="Теги (через запятую)">
            <input value={form.tags} onChange={e => set('tags', e.target.value)}
              className={input} placeholder="маме, день рождения, романтика" />
          </Field>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-5">
          <h2 className="font-semibold text-gray-800">Характеристики</h2>

          {/* Colors */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Цвет</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => {
                const checked = form.colors.includes(c.value)
                return (
                  <button key={c.value} type="button"
                    onClick={() => set('colors', checked
                      ? form.colors.filter(v => v !== c.value)
                      : [...form.colors, c.value]
                    )}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition ${
                      checked ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full border border-gray-200 flex-shrink-0"
                      style={{ background: c.hex }} />
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Packaging + count */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Упаковка">
              <select value={form.packaging} onChange={e => set('packaging', e.target.value)} className={input}>
                <option value="">Не указана</option>
                {PACKAGING_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Количество цветов">
              <input type="number" min={1} value={form.flowerCount}
                onChange={e => set('flowerCount', e.target.value)}
                className={input} placeholder="25" />
            </Field>
          </div>

          {/* Габариты */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Габариты (отображаются на фото)</label>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Ширина (см)">
                <input type="number" min={1} value={form.width}
                  onChange={e => set('width', e.target.value)}
                  className={input} placeholder="30" />
              </Field>
              <Field label="Высота (см)">
                <input type="number" min={1} value={form.height}
                  onChange={e => set('height', e.target.value)}
                  className={input} placeholder="40" />
              </Field>
            </div>
          </div>

          {/* Группа и аддон */}
          <Field label="ID группы (для объединения карточек через Excel)">
            <input value={form.groupId} onChange={e => set('groupId', e.target.value)}
              className={input} placeholder="rose-31 — одинаковый у карточек одной группы" />
          </Field>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Дополнение к заказу</h2>
          <p className="text-xs text-gray-400">Товары-дополнения (игрушки, открытки, топперы) показываются в блоке «Добавьте к заказу» на страницах товаров</p>
          <Toggle label="Это дополнение к заказу" checked={form.isAddon} onChange={v => set('isAddon', v)} />
          {form.isAddon && (
            <Field label="Подкатегория (напр.: Игрушки, Открытки, Топперы)">
              <input value={form.addonCategory} onChange={e => set('addonCategory', e.target.value)}
                className={input} placeholder="Игрушки" />
            </Field>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Фотографии</h2>

          <ProductImages images={form.images} onChange={images => set('images', images)} />

          <div className="flex gap-2">
            <input
              value={newImage}
              onChange={e => setNewImage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addImage())}
              className={input + ' flex-1'}
              placeholder="Вставьте ссылку на фото и нажмите +"
            />
            <button type="button" onClick={addImage}
              className="bg-pink-500 hover:bg-pink-600 text-white px-3 rounded-lg transition">
              <Plus size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs text-gray-400">или</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,image/heic,image/heif,.heic,.heif"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-200 hover:border-pink-300 hover:bg-pink-50 text-gray-500 hover:text-pink-500 rounded-xl py-4 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={16} />
            {uploading ? 'Загрузка...' : 'Загрузить фото с компьютера (можно несколько)'}
          </button>
          {uploadError && (
            <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{uploadError}</p>
          )}

          <Field label="Ссылка на видео (необязательно)">
            <input value={form.video} onChange={e => set('video', e.target.value)}
              className={input} placeholder="https://..." />
          </Field>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Статусы</h2>
          <div className="flex gap-6 flex-wrap">
            <Toggle label="Видна в каталоге" checked={form.isVisible} onChange={v => set('isVisible', v)} />
            <Toggle label="В наличии" checked={form.inStock} onChange={v => set('inStock', v)} />
            <Toggle label="Хит продаж" checked={form.isHit} onChange={v => set('isHit', v)} />
            <Toggle label="Новинка" checked={form.isNew} onChange={v => set('isNew', v)} />
          </div>
        </div>

        {occasions.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-1">Поводы</h2>
            <p className="text-xs text-gray-400 mb-4">К каким поводам подходит этот букет</p>
            <div className="grid grid-cols-2 gap-2">
              {occasions.map(o => {
                const checked = form.occasionIds.includes(o.id)
                return (
                  <label key={o.id} className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => set('occasionIds', checked
                        ? form.occasionIds.filter(id => id !== o.id)
                        : [...form.occasionIds, o.id]
                      )}
                      className="w-4 h-4 accent-pink-500 rounded"
                    />
                    <span className="text-sm text-gray-700">{o.name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {sections.filter(s => s.type !== 'reviews' && s.type !== 'blog' && s.type !== 'advantages').length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-1">Блоки главной страницы</h2>
            <p className="text-xs text-gray-400 mb-4">Товар будет показан в выбранных блоках независимо от категории</p>
            <div className="grid grid-cols-2 gap-2">
              {sections
                .filter(s => s.type !== 'reviews' && s.type !== 'blog' && s.type !== 'advantages')
                .map(s => {
                  const checked = form.sectionIds.includes(s.id)
                  return (
                    <label key={s.id} className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => set('sectionIds', checked
                          ? form.sectionIds.filter(id => id !== s.id)
                          : [...form.sectionIds, s.id]
                        )}
                        className="w-4 h-4 accent-pink-500 rounded"
                      />
                      <span className="text-sm text-gray-700">{s.title}</span>
                      <span className="text-xs text-gray-400 ml-auto">{SECTION_TYPE_LABELS[s.type] ?? s.type}</span>
                    </label>
                  )
                })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-1">Популярность по районам</h2>
          <p className="text-xs text-gray-400 mb-4">Товар будет отображаться в блоке «Популярные букеты» на странице района</p>
          <div className="grid grid-cols-2 gap-2">
            {DISTRICTS.map(d => {
              const checked = form.popularInDistricts.includes(d.name) || form.popularInDistricts.includes(d.slug)
              return (
                <label key={d.slug} className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => set('popularInDistricts', checked
                      ? form.popularInDistricts.filter(s => s !== d.name && s !== d.slug)
                      : [...form.popularInDistricts.filter(s => s !== d.slug), d.name]
                    )}
                    className="w-4 h-4 accent-pink-500 rounded"
                  />
                  <span className="text-sm text-gray-700">{d.name}</span>
                </label>
              )
            })}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium py-3 rounded-xl transition disabled:opacity-50">
          {saving ? 'Сохранение...' : productId ? 'Сохранить изменения' : 'Создать товар'}
        </button>
      </form>
    </div>
  )
}

const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full transition relative ${checked ? 'bg-pink-500' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}
