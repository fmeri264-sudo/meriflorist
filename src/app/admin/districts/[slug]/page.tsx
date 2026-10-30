'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Plus, Trash2, Save } from 'lucide-react'

interface DeliveryZone { name: string; time: string; price: number; freeFrom: number }
interface Faq { q: string; a: string }
interface District {
  slug: string
  name: string
  nameRod: string
  namePred: string
  h1: string
  metaTitle: string
  metaDescription: string
  subtitle: string
  intro: string
  neighborhoods: string[]
  trafficNote: string
  deliveryTime: string
  zones: DeliveryZone[]
  bodyText: string
  faqs: Faq[]
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

const INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400'
const TEXTAREA = INPUT + ' resize-none'

export default function DistrictEditPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [form, setForm] = useState<District | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/districts/${slug}`)
      .then(r => r.json())
      .then(setForm)
  }, [slug])

  function set<K extends keyof District>(key: K, value: District[K]) {
    setForm(f => f ? { ...f, [key]: value } : f)
    setSaved(false)
  }

  function setZone(i: number, field: keyof DeliveryZone, value: string | number) {
    setForm(f => {
      if (!f) return f
      const zones = f.zones.map((z, idx) => idx === i ? { ...z, [field]: value } : z)
      return { ...f, zones }
    })
    setSaved(false)
  }

  function addZone() {
    setForm(f => f ? { ...f, zones: [...f.zones, { name: '', time: '', price: 0, freeFrom: 0 }] } : f)
  }

  function removeZone(i: number) {
    setForm(f => f ? { ...f, zones: f.zones.filter((_, idx) => idx !== i) } : f)
  }

  function setFaq(i: number, field: 'q' | 'a', value: string) {
    setForm(f => {
      if (!f) return f
      const faqs = f.faqs.map((faq, idx) => idx === i ? { ...faq, [field]: value } : faq)
      return { ...f, faqs }
    })
    setSaved(false)
  }

  function addFaq() {
    setForm(f => f ? { ...f, faqs: [...f.faqs, { q: '', a: '' }] } : f)
  }

  function removeFaq(i: number) {
    setForm(f => f ? { ...f, faqs: f.faqs.filter((_, idx) => idx !== i) } : f)
  }

  async function save() {
    if (!form) return
    setSaving(true)
    const res = await fetch(`/api/admin/districts/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) setSaved(true)
  }

  if (!form) return <div className="p-6 text-gray-400">Загрузка...</div>

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/districts" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{form.name}</h1>
          <a href={`/dostavka-cvetov/${slug}`} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline">
            /dostavka-cvetov/{slug} ↗
          </a>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
        >
          <Save size={15} />
          {saving ? 'Сохранение...' : saved ? 'Сохранено ✓' : 'Сохранить'}
        </button>
      </div>

      <div className="space-y-8">

        {/* SEO */}
        <section className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">SEO</h2>
          <Field label="Meta Title">
            <input className={INPUT} value={form.metaTitle} onChange={e => set('metaTitle', e.target.value)} />
          </Field>
          <Field label="Meta Description">
            <textarea className={TEXTAREA} rows={2} value={form.metaDescription} onChange={e => set('metaDescription', e.target.value)} />
          </Field>
        </section>

        {/* Заголовки */}
        <section className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Заголовки</h2>
          <Field label="H1">
            <input className={INPUT} value={form.h1} onChange={e => set('h1', e.target.value)} />
          </Field>
          <Field label="Подзаголовок (subtitle)">
            <textarea className={TEXTAREA} rows={2} value={form.subtitle} onChange={e => set('subtitle', e.target.value)} />
          </Field>
          <Field label="Вводный текст (intro)">
            <textarea className={TEXTAREA} rows={3} value={form.intro} onChange={e => set('intro', e.target.value)} />
          </Field>
        </section>

        {/* Грамматические формы */}
        <section className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Склонения</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Название (им. пад.)">
              <input className={INPUT} value={form.name} onChange={e => set('name', e.target.value)} />
            </Field>
            <Field label="Род. падеж (района)">
              <input className={INPUT} value={form.nameRod} onChange={e => set('nameRod', e.target.value)} />
            </Field>
            <Field label="Предл. падеж (в районе)">
              <input className={INPUT} value={form.namePred} onChange={e => set('namePred', e.target.value)} />
            </Field>
          </div>
        </section>

        {/* Доставка */}
        <section className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Доставка</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Время доставки">
              <input className={INPUT} value={form.deliveryTime} onChange={e => set('deliveryTime', e.target.value)} placeholder="1–2 часа" />
            </Field>
            <Field label="Заметка о пробках">
              <input className={INPUT} value={form.trafficNote} onChange={e => set('trafficNote', e.target.value)} />
            </Field>
          </div>
          <Field label="Микрорайоны (через запятую)">
            <input
              className={INPUT}
              value={form.neighborhoods.join(', ')}
              onChange={e => set('neighborhoods', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            />
          </Field>
        </section>

        {/* Зоны */}
        <section className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Зоны доставки</h2>
            <button onClick={addZone} className="flex items-center gap-1 text-sm text-pink-500 hover:text-pink-600">
              <Plus size={15} /> Добавить
            </button>
          </div>
          <div className="space-y-3">
            {form.zones.map((z, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-start">
                <input className={INPUT} placeholder="Название зоны" value={z.name} onChange={e => setZone(i, 'name', e.target.value)} />
                <input className={INPUT + ' w-24'} placeholder="Время" value={z.time} onChange={e => setZone(i, 'time', e.target.value)} />
                <input className={INPUT + ' w-24'} type="number" placeholder="Цена ₽" value={z.price} onChange={e => setZone(i, 'price', Number(e.target.value))} />
                <input className={INPUT + ' w-28'} type="number" placeholder="Бесплатно от" value={z.freeFrom} onChange={e => setZone(i, 'freeFrom', Number(e.target.value))} />
                <button onClick={() => removeZone(i)} className="p-2 text-gray-300 hover:text-red-400 transition">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Текст страницы */}
        <section className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Основной текст страницы</h2>
          <textarea
            className={TEXTAREA}
            rows={12}
            value={form.bodyText}
            onChange={e => set('bodyText', e.target.value)}
          />
          <p className="text-xs text-gray-400">Абзацы разделяются пустой строкой</p>
        </section>

        {/* FAQ */}
        <section className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">FAQ</h2>
            <button onClick={addFaq} className="flex items-center gap-1 text-sm text-pink-500 hover:text-pink-600">
              <Plus size={15} /> Добавить вопрос
            </button>
          </div>
          <div className="space-y-4">
            {form.faqs.map((faq, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <input className={INPUT} placeholder="Вопрос" value={faq.q} onChange={e => setFaq(i, 'q', e.target.value)} />
                    <textarea className={TEXTAREA} rows={2} placeholder="Ответ" value={faq.a} onChange={e => setFaq(i, 'a', e.target.value)} />
                  </div>
                  <button onClick={() => removeFaq(i)} className="p-2 text-gray-300 hover:text-red-400 transition mt-1">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      <div className="mt-6">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
        >
          <Save size={15} />
          {saving ? 'Сохранение...' : saved ? 'Сохранено ✓' : 'Сохранить изменения'}
        </button>
      </div>
    </div>
  )
}
