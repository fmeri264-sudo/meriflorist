'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Check, ExternalLink, Plus, Trash2, ChevronUp, ChevronDown,
  Type, Image, LayoutTemplate, Heading,
  Bold, Italic, List, Link2, AlignLeft,
} from 'lucide-react'
import type { Block } from '@/lib/pages'

interface PageData {
  id: number
  slug: string
  title: string
  metaTitle?: string
  metaDescription?: string
  published: boolean
  showInHeader: boolean
  showInFooter: boolean
  headerLabel?: string
  customPath?: string
  category?: string | null
  blocks: Block[]
}

const CATEGORIES: Record<string, string> = {
  events: 'События и акции',
  news:   'Новости',
  tips:   'Советы',
}

type BlockType = 'text' | 'banner' | 'products' | 'heading'

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: 'heading', label: 'Заголовок', icon: <Heading size={16} />, desc: 'H1/H2/H3' },
  { type: 'text', label: 'Текст', icon: <Type size={16} />, desc: 'HTML-контент' },
  { type: 'banner', label: 'Баннер', icon: <LayoutTemplate size={16} />, desc: 'Фото + текст + кнопка' },
  { type: 'products', label: 'Товары', icon: <Image size={16} />, desc: 'Сетка товаров' },
]

function newBlock(type: BlockType): Block {
  const id = Math.random().toString(36).slice(2, 10)
  if (type === 'text') return { id, type, content: '<p>Введите текст...</p>' }
  if (type === 'banner') return { id, type, imageUrl: '', title: '', subtitle: '', buttonText: '', buttonUrl: '', overlay: true }
  if (type === 'products') return { id, type, title: '', productIds: [] }
  return { id, type: 'heading', text: 'Заголовок', level: 2 }
}

// Конвертирует plain text с переносами строк в HTML-параграфы
function plainToHtml(text: string): string {
  if (/<[a-z][\s\S]*>/i.test(text)) return text  // уже HTML
  return text.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
}

function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [showHtml, setShowHtml] = useState(false)

  useEffect(() => {
    if (editorRef.current) {
      document.execCommand('defaultParagraphSeparator', false, 'p')
      editorRef.current.innerHTML = plainToHtml(value) || '<p><br></p>'
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function exec(cmd: string, arg?: string) {
    editorRef.current?.focus()
    document.execCommand(cmd, false, arg)
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }

  function addLink() {
    const url = prompt('Ссылка (URL):', 'https://')
    if (url) exec('createLink', url)
  }

  const btnCls = 'p-1.5 rounded hover:bg-gray-200 text-gray-600 transition'

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Тулбар */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200 flex-wrap">
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('bold') }} className={btnCls} title="Жирный"><Bold size={14} /></button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('italic') }} className={btnCls} title="Курсив"><Italic size={14} /></button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList') }} className={btnCls} title="Список"><List size={14} /></button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'p') }} className={btnCls} title="Параграф"><AlignLeft size={14} /></button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'h3') }} className={`${btnCls} text-xs font-bold px-2`} title="Подзаголовок">H3</button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button type="button" onMouseDown={e => { e.preventDefault(); addLink() }} className={btnCls} title="Ссылка"><Link2 size={14} /></button>
        <div className="flex-1" />
        <button type="button" onClick={() => setShowHtml(v => !v)} className={`${btnCls} text-xs font-mono px-2`} title="HTML-код">&lt;/&gt;</button>
      </div>

      {showHtml ? (
        <textarea
          className="w-full px-3 py-2 text-xs font-mono focus:outline-none resize-y min-h-[160px]"
          value={value}
          onChange={e => {
            onChange(e.target.value)
            if (editorRef.current) editorRef.current.innerHTML = e.target.value
          }}
          rows={8}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => { if (editorRef.current) onChange(editorRef.current.innerHTML) }}
          className="px-3 py-3 min-h-[160px] text-sm focus:outline-none prose prose-sm max-w-none"
          style={{ lineHeight: '1.7' }}
        />
      )}
    </div>
  )
}

function BlockEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function uploadImage(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.url) onChange({ ...block, imageUrl: data.url } as Block)
    setUploading(false)
  }

  if (block.type === 'heading') {
    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Текст заголовка</label>
          <input
            value={block.text}
            onChange={e => onChange({ ...block, text: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Уровень</label>
          <select
            value={block.level ?? 2}
            onChange={e => onChange({ ...block, level: Number(e.target.value) as 1|2|3 })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
          >
            <option value={1}>H1 — очень крупный</option>
            <option value={2}>H2 — крупный</option>
            <option value={3}>H3 — средний</option>
          </select>
        </div>
      </div>
    )
  }

  if (block.type === 'text') {
    return (
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-2">Текст</label>
        <RichTextEditor
          value={block.content}
          onChange={content => onChange({ ...block, content })}
        />
        <p className="text-xs text-gray-400 mt-1.5">
          Выделите текст и нажмите кнопки тулбара для форматирования. Кнопка &lt;/&gt; — режим HTML.
        </p>
      </div>
    )
  }

  if (block.type === 'banner') {
    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Изображение</label>
          <div className="flex gap-2">
            <input
              value={block.imageUrl}
              onChange={e => onChange({ ...block, imageUrl: e.target.value })}
              placeholder="https://... или загрузите файл"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="shrink-0 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
            >
              {uploading ? '...' : 'Загрузить'}
            </button>
          </div>
          {block.imageUrl && (
            <img src={block.imageUrl} alt="" className="mt-2 h-24 w-auto rounded-lg object-cover border border-gray-200" />
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Заголовок</label>
            <input value={block.title ?? ''} onChange={e => onChange({ ...block, title: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Подзаголовок</label>
            <input value={block.subtitle ?? ''} onChange={e => onChange({ ...block, subtitle: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Кнопка — текст</label>
            <input value={block.buttonText ?? ''} onChange={e => onChange({ ...block, buttonText: e.target.value })}
              placeholder="Перейти в каталог"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Кнопка — ссылка</label>
            <input value={block.buttonUrl ?? ''} onChange={e => onChange({ ...block, buttonUrl: e.target.value })}
              placeholder="/catalog"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={block.overlay ?? true}
            onChange={e => onChange({ ...block, overlay: e.target.checked })}
            className="rounded" />
          <span className="text-sm text-gray-600">Тёмный оверлей (для читаемости текста)</span>
        </label>
      </div>
    )
  }

  if (block.type === 'products') {
    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Заголовок блока</label>
          <input value={block.title ?? ''} onChange={e => onChange({ ...block, title: e.target.value })}
            placeholder="Популярные букеты"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">ID товаров через запятую</label>
          <input
            value={(block.productIds ?? []).join(', ')}
            onChange={e => {
              const ids = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
              onChange({ ...block, productIds: ids })
            }}
            placeholder="1, 5, 12, 34"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
          <p className="text-xs text-gray-400 mt-1">ID товаров можно найти в разделе Товары. Максимум 12 штук.</p>
        </div>
      </div>
    )
  }

  return null
}

const BLOCK_LABELS: Record<string, string> = {
  heading: 'Заголовок',
  text: 'Текст',
  banner: 'Баннер',
  products: 'Товары',
}

export default function PageEditPage() {
  const params = useParams()
  const id = params.id as string

  const [page, setPage] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [addingBlock, setAddingBlock] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/pages/${id}`)
    if (res.ok) setPage(await res.json())
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  function updateField<K extends keyof PageData>(key: K, value: PageData[K]) {
    setPage(p => p ? { ...p, [key]: value } : p)
    setSaved(false)
  }

  function updateBlock(idx: number, block: Block) {
    setPage(p => {
      if (!p) return p
      const blocks = [...p.blocks]
      blocks[idx] = block
      return { ...p, blocks }
    })
    setSaved(false)
  }

  function addBlock(type: BlockType) {
    setPage(p => p ? { ...p, blocks: [...p.blocks, newBlock(type)] } : p)
    setAddingBlock(false)
    setSaved(false)
  }

  function removeBlock(idx: number) {
    setPage(p => {
      if (!p) return p
      const blocks = p.blocks.filter((_, i) => i !== idx)
      return { ...p, blocks }
    })
    setSaved(false)
  }

  function moveBlock(idx: number, dir: -1 | 1) {
    setPage(p => {
      if (!p) return p
      const blocks = [...p.blocks]
      const target = idx + dir
      if (target < 0 || target >= blocks.length) return p
      ;[blocks[idx], blocks[target]] = [blocks[target], blocks[idx]]
      return { ...p, blocks }
    })
    setSaved(false)
  }

  async function save() {
    if (!page) return
    setSaving(true)
    setSaveError('')
    const res = await fetch(`/api/admin/pages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: page.title,
        slug: page.slug,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        published: page.published,
        showInHeader: page.showInHeader,
        showInFooter: page.showInFooter,
        headerLabel: page.headerLabel,
        customPath: page.customPath ?? '',
        blocks: page.blocks,
        category: page.category ?? null,
      }),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } else {
      const data = await res.json()
      setSaveError(data.error ?? 'Ошибка сохранения')
    }
    setSaving(false)
  }

  if (loading) return <div className="p-6 text-gray-400">Загрузка...</div>
  if (!page) return <div className="p-6 text-red-500">Страница не найдена</div>

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
        <Link href="/admin/pages" className="text-gray-400 hover:text-gray-700 transition">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-gray-900 truncate">{page.title || 'Без названия'}</h1>
          <p className="text-xs text-gray-400">
            {page.customPath ? `/${page.customPath}` : `/pages/${page.slug}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {page.published && (
            <a
              href={page.customPath ? `/${page.customPath}` : `/pages/${page.slug}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition">
              <ExternalLink size={14} /> Открыть
            </a>
          )}
          {saveError && <span className="text-xs text-red-500">{saveError}</span>}
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            {saved ? <><Check size={15} /> Сохранено</> : saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Settings */}
        <aside className="w-72 shrink-0 border-r border-gray-100 overflow-y-auto p-5 space-y-5 bg-gray-50/50">

          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Основное</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Название страницы</label>
                <input value={page.title} onChange={e => updateField('title', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">URL (slug)</label>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <span className="text-xs text-gray-400 px-2 border-r border-gray-200 bg-gray-50 py-2">/pages/</span>
                  <input
                    value={page.slug}
                    onChange={e => updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    className="flex-1 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Прямой URL (необязательно)</label>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <span className="text-xs text-gray-400 px-2 border-r border-gray-200 bg-gray-50 py-2">/</span>
                  <input
                    value={page.customPath ?? ''}
                    onChange={e => updateField('customPath', e.target.value.replace(/^\/+/, '').replace(/[^a-z0-9/-]/g, '-'))}
                    placeholder="aktsiya-leto"
                    className="flex-1 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Если заполнить — страница откроется по этому адресу вместо /pages/slug
                </p>
              </div>
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Публикация</p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={page.published}
                    onChange={e => updateField('published', e.target.checked)} />
                  <div className={`w-9 h-5 rounded-full transition ${page.published ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${page.published ? 'translate-x-4' : ''}`} />
                </div>
                <span className="text-sm text-gray-700">{page.published ? 'Опубликована' : 'Черновик'}</span>
              </label>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Категория</label>
                <select
                  value={page.category ?? ''}
                  onChange={e => updateField('category', e.target.value || null)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-300"
                >
                  <option value="">— Без категории —</option>
                  {Object.entries(CATEGORIES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Размещение</p>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5 rounded" checked={page.showInHeader}
                  onChange={e => updateField('showInHeader', e.target.checked)} />
                <div>
                  <p className="text-sm font-medium text-gray-700">В шапке сайта</p>
                  <p className="text-xs text-gray-400">Ссылка появится в навигации</p>
                </div>
              </label>
              {page.showInHeader && (
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Подпись в меню (если отличается от названия)</label>
                  <input value={page.headerLabel ?? ''} onChange={e => updateField('headerLabel', e.target.value)}
                    placeholder={page.title}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
              )}
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5 rounded" checked={page.showInFooter}
                  onChange={e => updateField('showInFooter', e.target.checked)} />
                <div>
                  <p className="text-sm font-medium text-gray-700">В подвале сайта</p>
                  <p className="text-xs text-gray-400">Ссылка появится в footer → Навигация</p>
                </div>
              </label>
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">SEO</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Title (для поисковиков)</label>
                <input value={page.metaTitle ?? ''} onChange={e => updateField('metaTitle', e.target.value)}
                  placeholder={page.title}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
                <textarea value={page.metaDescription ?? ''} onChange={e => updateField('metaDescription', e.target.value)}
                  rows={3} placeholder="Краткое описание для поисковиков..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none" />
              </div>
            </div>
          </section>
        </aside>

        {/* Right: Blocks */}
        <main className="flex-1 overflow-y-auto p-6">
          {page.blocks.length === 0 && !addingBlock && (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <LayoutTemplate size={48} className="mb-4 opacity-30" />
              <p className="text-lg font-medium mb-1">Страница пустая</p>
              <p className="text-sm mb-6">Добавьте блоки чтобы создать контент</p>
              <button
                onClick={() => setAddingBlock(true)}
                className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition"
              >
                <Plus size={16} /> Добавить первый блок
              </button>
            </div>
          )}

          <div className="space-y-4 max-w-3xl">
            {page.blocks.map((block, idx) => (
              <div key={block.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Block header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {BLOCK_LABELS[block.type] ?? block.type}
                  </span>
                  <div className="flex-1" />
                  <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0}
                    className="p-1 rounded text-gray-400 hover:text-gray-700 disabled:opacity-20 transition">
                    <ChevronUp size={15} />
                  </button>
                  <button onClick={() => moveBlock(idx, 1)} disabled={idx === page.blocks.length - 1}
                    className="p-1 rounded text-gray-400 hover:text-gray-700 disabled:opacity-20 transition">
                    <ChevronDown size={15} />
                  </button>
                  <button onClick={() => removeBlock(idx)}
                    className="p-1 rounded text-gray-400 hover:text-red-500 transition">
                    <Trash2 size={15} />
                  </button>
                </div>
                {/* Block editor */}
                <div className="p-4">
                  <BlockEditor block={block} onChange={b => updateBlock(idx, b)} />
                </div>
              </div>
            ))}

            {/* Add block */}
            {addingBlock ? (
              <div className="bg-white border border-dashed border-pink-300 rounded-xl p-5">
                <p className="text-sm font-semibold text-gray-700 mb-3">Выберите тип блока:</p>
                <div className="grid grid-cols-2 gap-3">
                  {BLOCK_TYPES.map(bt => (
                    <button key={bt.type} onClick={() => addBlock(bt.type)}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-pink-300 hover:bg-pink-50 transition text-left">
                      <span className="text-pink-500">{bt.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{bt.label}</p>
                        <p className="text-xs text-gray-400">{bt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setAddingBlock(false)}
                  className="mt-3 text-sm text-gray-400 hover:text-gray-600 transition">Отмена</button>
              </div>
            ) : page.blocks.length > 0 && (
              <button onClick={() => setAddingBlock(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:text-pink-500 hover:border-pink-300 transition">
                <Plus size={16} /> Добавить блок
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
