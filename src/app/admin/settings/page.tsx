'use client'

import { useEffect, useState, useRef } from 'react'
import { Check, Upload, RefreshCw } from 'lucide-react'
import type { SiteSettings } from '@/lib/settings'
import { SETTING_DEFAULTS } from '@/lib/settings'
import BannerPreview from '@/components/admin/BannerPreview'

type SettingKey = keyof SiteSettings

function useSave() {
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  async function save(key: SettingKey, value: string) {
    setSaving(key)
    setSaved(null)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (!response.ok) throw new Error('Save failed')
      setSaved(key)
      setTimeout(() => setSaved(null), 2000)
    } catch {
      alert('Не удалось сохранить настройку. Повторите попытку.')
    } finally {
      setSaving(null)
    }
  }

  return { save, saving, saved }
}

function Field({
  label,
  fieldKey,
  value,
  onChange,
  onSave,
  saving,
  saved,
  placeholder,
  hint,
}: {
  label: string
  fieldKey: SettingKey
  value: string
  onChange: (v: string) => void
  onSave: (key: SettingKey, value: string) => void
  saving: string | null
  saved: string | null
  placeholder?: string
  hint?: string
}) {
  const isSaving = saving === fieldKey
  const isSaved = saved === fieldKey
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
        />
        <button
          onClick={() => onSave(fieldKey, value)}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white transition"
        >
          {isSaved ? <><Check size={14} /> Сохранено</> : isSaving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}

function TextareaField({
  label,
  fieldKey,
  value,
  onChange,
  onSave,
  saving,
  saved,
  placeholder,
}: {
  label: string
  fieldKey: SettingKey
  value: string
  onChange: (v: string) => void
  onSave: (key: SettingKey, value: string) => void
  saving: string | null
  saved: string | null
  placeholder?: string
}) {
  const isSaving = saving === fieldKey
  const isSaved = saved === fieldKey
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <button
          onClick={() => onSave(fieldKey, value)}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white transition"
        >
          {isSaved ? <><Check size={14} /> Сохранено</> : isSaving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={10}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-pink-300"
      />
      <p className="text-xs text-gray-400 mt-1">Разделяйте абзацы пустой строкой</p>
    </div>
  )
}

export default function AdminSettingsPage() {
  const [vals, setVals] = useState<SiteSettings>(SETTING_DEFAULTS)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { save, saving, saved } = useSave()

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then((data: Partial<SiteSettings>) => setVals(v => ({ ...v, ...data })))
  }, [])

  function set(key: SettingKey) {
    return (value: string) => setVals(v => ({ ...v, [key]: value }))
  }

  async function uploadLogo(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.url) {
      setVals(v => ({ ...v, logoUrl: data.url }))
      await save('logoUrl', data.url)
    }
    setUploading(false)
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Настройки сайта</h1>

      {/* Основное */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Основное</h2>
        <div className="space-y-4">
          <Field
            label="Название сайта"
            fieldKey="siteName"
            value={vals.siteName}
            onChange={set('siteName')}
            onSave={save}
            saving={saving}
            saved={saved}
            placeholder="Meri Florist"
            hint="Отображается в шапке, если не загружен логотип"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Логотип</label>
            <p className="text-xs text-gray-400 mb-2">Новый логотип Мэри включён по умолчанию. Для замены загрузите горизонтальный PNG с прозрачным фоном.</p>
            <div className="flex items-center gap-3">
              {vals.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vals.logoUrl} alt="Логотип" className="h-12 w-auto object-contain border rounded-lg p-1" />
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-pink-400 hover:text-pink-500 transition"
              >
                <Upload size={16} />
                {uploading ? 'Загрузка...' : vals.logoUrl ? 'Заменить логотип' : 'Загрузить логотип'}
              </button>
              {vals.logoUrl && (
                <button
                  onClick={() => { setVals(v => ({ ...v, logoUrl: '' })); save('logoUrl', '') }}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Удалить
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])}
            />
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 id="hero-banner" className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b scroll-mt-8">Главный баннер</h2>
        <p className="text-sm text-gray-500 mb-4">Фото занимает большую часть первого экрана. Все существующие блоки и поводы управляются в своих разделах.</p>
        <div className="space-y-4">
          <Field label="Главное фото (ссылка)" fieldKey="heroImageUrl" value={vals.heroImageUrl} onChange={set('heroImageUrl')} onSave={save} saving={saving} saved={saved} hint="Загрузите фото через кнопку ниже или вставьте ссылку." />
          <Field label="Фото для телефона (необязательно)" fieldKey="heroMobileImageUrl" value={vals.heroMobileImageUrl} onChange={set('heroMobileImageUrl')} onSave={save} saving={saving} saved={saved} hint="Если не задано, используется главное фото." />
          <Field label="Положение кадра" fieldKey="heroImagePosition" value={vals.heroImagePosition} onChange={set('heroImagePosition')} onSave={save} saving={saving} saved={saved} hint="Например: 50% 50% — по центру; 50% 30% — выше." />
          <Field label="Заголовок баннера" fieldKey="heroTitle" value={vals.heroTitle} onChange={set('heroTitle')} onSave={save} saving={saving} saved={saved} hint="" />
          <Field label="Описание баннера" fieldKey="heroDescription" value={vals.heroDescription} onChange={set('heroDescription')} onSave={save} saving={saving} saved={saved} hint="" />
          <Field label="Текст кнопки" fieldKey="heroButtonText" value={vals.heroButtonText} onChange={set('heroButtonText')} onSave={save} saving={saving} saved={saved} hint="" />
          <Field label="Ссылка кнопки" fieldKey="heroButtonUrl" value={vals.heroButtonUrl} onChange={set('heroButtonUrl')} onSave={save} saving={saving} saved={saved} hint="Например: /catalog или /catalog?occasion=birthday" />
          <label className="block text-sm font-medium">Загрузить главное фото
            <input type="file" accept="image/*" className="block mt-2 text-sm" onChange={async e => {
              const file = e.target.files?.[0]
              if (!file) return
              const fd = new FormData()
              fd.append('file', file)
              try {
                const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
                const data = await res.json()
                if (!res.ok || !data.url) throw new Error('Не удалось загрузить фото')
                setVals(v => ({ ...v, heroImageUrl: data.url }))
                await save('heroImageUrl', data.url)
              } catch { alert('Не удалось сохранить фото. Попробуйте ещё раз.') }
              e.target.value = ''
            }} />
          </label>
          <BannerPreview settings={vals} />
          {vals.heroImageUrl && <a href="/" target="_blank" rel="noopener noreferrer" className="text-rose-700 underline">Посмотреть главную ↗</a>}
        </div>
      </section>

<section className="mb-8"><h2 className="text-lg font-semibold mb-4">Подборка, сезонный баннер и О Мэри</h2><div className="space-y-4"><Field label="Заголовок подборки" fieldKey="homeSelectionTitle" value={vals.homeSelectionTitle} onChange={set('homeSelectionTitle')} onSave={save} saving={saving} saved={saved} hint="Подборка из первых восьми основных товаров каталога." /><Field label="Фото сезонного баннера" fieldKey="homeSeasonalImageUrl" value={vals.homeSeasonalImageUrl} onChange={set('homeSeasonalImageUrl')} onSave={save} saving={saving} saved={saved} hint="Пустое поле скрывает сезонный баннер." /><Field label="Заголовок сезонного баннера" fieldKey="homeSeasonalTitle" value={vals.homeSeasonalTitle} onChange={set('homeSeasonalTitle')} onSave={save} saving={saving} saved={saved} hint="" /><Field label="Ссылка сезонного баннера" fieldKey="homeSeasonalLink" value={vals.homeSeasonalLink} onChange={set('homeSeasonalLink')} onSave={save} saving={saving} saved={saved} hint="Например: /catalog?section=3" /><Field label="Текст «О Мэри»" fieldKey="homeAboutText" value={vals.homeAboutText} onChange={set('homeAboutText')} onSave={save} saving={saving} saved={saved} hint="Пустое поле скрывает блок." /><Field label="Фото студии или флориста" fieldKey="homeAboutImageUrl" value={vals.homeAboutImageUrl} onChange={set('homeAboutImageUrl')} onSave={save} saving={saving} saved={saved} hint="Необязательно. Укажите ссылку на настоящее фото." /></div></section>
      {/* Контакты */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Контакты в шапке</h2>
        <div className="space-y-4">
          <Field
            label="Телефон"
            fieldKey="phone"
            value={vals.phone}
            onChange={set('phone')}
            onSave={save}
            saving={saving}
            saved={saved}
            placeholder="+7 (900) 000-00-00"
          />
          <Field
            label="WhatsApp (ссылка)"
            fieldKey="whatsapp"
            value={vals.whatsapp}
            onChange={set('whatsapp')}
            onSave={save}
            saving={saving}
            saved={saved}
            placeholder="https://wa.me/7XXXXXXXXXX"
          />
          <Field
            label="Telegram (ссылка)"
            fieldKey="telegram"
            value={vals.telegram}
            onChange={set('telegram')}
            onSave={save}
            saving={saving}
            saved={saved}
            placeholder="https://t.me/username"
          />
          <Field
            label="ВКонтакте (ссылка)"
            fieldKey="vk"
            value={vals.vk}
            onChange={set('vk')}
            onSave={save}
            saving={saving}
            saved={saved}
            placeholder="https://vk.com/meriflorist"
          />
          <Field
            label="MAX (ссылка)"
            fieldKey="max"
            value={vals.max}
            onChange={set('max')}
            onSave={save}
            saving={saving}
            saved={saved}
            placeholder="https://max.ru/..."
            hint="Мессенджер MAX (бывший ICQ)"
          />
        </div>
      </section>

      {/* Страница Доставка и оплата */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
          Страница «Доставка и оплата»
          <a href="/delivery" target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-pink-400 hover:underline font-normal">
            открыть ↗
          </a>
        </h2>
        <TextareaField
          label=""
          fieldKey="pageDelivery"
          value={vals.pageDelivery}
          onChange={set('pageDelivery')}
          onSave={save}
          saving={saving}
          saved={saved}
          placeholder="Введите текст страницы. Пустая строка между абзацами создаёт новый абзац."
        />
      </section>

      {/* Страница Контакты */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
          Страница «Контакты»
          <a href="/contacts" target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-pink-400 hover:underline font-normal">
            открыть ↗
          </a>
        </h2>
        <p className="text-xs text-gray-400 mb-3">
          Телефон и мессенджеры подтягиваются автоматически из раздела «Контакты в шапке». Здесь можно добавить адрес, режим работы и другой текст.
        </p>
        <TextareaField
          label=""
          fieldKey="pageContacts"
          value={vals.pageContacts}
          onChange={set('pageContacts')}
          onSave={save}
          saving={saving}
          saved={saved}
          placeholder="Например:&#10;Адрес: Санкт-Петербург, ул. Примерная, д. 1&#10;&#10;Режим работы: ежедневно с 9:00 до 21:00"
        />
      </section>

      {/* Подвал сайта */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Подвал сайта</h2>
        <div className="space-y-4">
          <Field
            label="Email (в подвале)"
            fieldKey="footerEmail"
            value={vals.footerEmail}
            onChange={set('footerEmail')}
            onSave={save}
            saving={saving}
            saved={saved}
            placeholder="info@meriflorist.ru"
          />
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Юридическая информация</label>
              <button
                onClick={() => save('footerLegal', vals.footerLegal)}
                disabled={saving === 'footerLegal'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white transition"
              >
                {saved === 'footerLegal' ? <><Check size={14} /> Сохранено</> : saving === 'footerLegal' ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-2">Отображается в нижней части подвала. Каждая строка — отдельная запись.</p>
            <textarea
              value={vals.footerLegal}
              onChange={e => set('footerLegal')(e.target.value)}
              rows={6}
              placeholder={'ООО «Мери Флорист» · ИНН 7801234567 · ОГРН 1234567890123\nЮридический адрес: 197000, г. Санкт-Петербург, ул. Примерная, д. 1\nФактический адрес: г. Санкт-Петербург, ул. Складская, д. 5'}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>
        </div>
      </section>

      {/* Синхронизация с meribuket.ru */}
      <SyncSection />
    </div>
  )
}

function SyncSection() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<{ ok?: boolean; updated?: number; catalog_items?: number; products_matched?: number; error?: string } | null>(null)

  async function syncInventory() {
    setSyncing(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/sync-inventory', { method: 'POST' })
      setResult(await res.json())
    } catch {
      setResult({ error: 'Ошибка соединения' })
    }
    setSyncing(false)
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
        Синхронизация с meribuket.ru
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Обновляет <strong>наличие</strong> и <strong>розничные цены</strong> товаров по данным склада meribuket.ru.
        Срабатывает только для товаров, у которых заполнен артикул (SKU).
      </p>
      <div className="flex items-center gap-4">
        <button
          onClick={syncInventory}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Синхронизация...' : 'Синхронизировать остатки'}
        </button>

        {result && (
          <div className={`text-sm rounded-lg px-4 py-2 ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {result.ok
              ? `Готово: обновлено ${result.updated} товаров из ${result.products_matched} (каталог meribuket: ${result.catalog_items} SKU)`
              : `Ошибка: ${result.error}`}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Артикул SKU задаётся в карточке товара → поле «Артикул meribuket.ru».
        Розничные цены задаются в meribuket.ru через меню Финансы → Розничные цены.
      </p>
    </section>
  )
}
