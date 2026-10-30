'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, Pencil, Trash2, Check, X, Upload, ImageOff } from 'lucide-react'
import Image from 'next/image'

interface Category { id: number; name: string; slug: string; image?: string; sort: number }

function slugify(t: string) {
  return t.toLowerCase()
    .replace(/[аА]/g,'a').replace(/[бБ]/g,'b').replace(/[вВ]/g,'v').replace(/[гГ]/g,'g')
    .replace(/[дД]/g,'d').replace(/[еЕёЁ]/g,'e').replace(/[жЖ]/g,'zh').replace(/[зЗ]/g,'z')
    .replace(/[иИ]/g,'i').replace(/[йЙ]/g,'y').replace(/[кК]/g,'k').replace(/[лЛ]/g,'l')
    .replace(/[мМ]/g,'m').replace(/[нН]/g,'n').replace(/[оО]/g,'o').replace(/[пП]/g,'p')
    .replace(/[рР]/g,'r').replace(/[сС]/g,'s').replace(/[тТ]/g,'t').replace(/[уУ]/g,'u')
    .replace(/[фФ]/g,'f').replace(/[хХ]/g,'kh').replace(/[цЦ]/g,'ts').replace(/[чЧ]/g,'ch')
    .replace(/[шШ]/g,'sh').replace(/[щЩ]/g,'sch').replace(/[ъЪьЬ]/g,'').replace(/[ыЫ]/g,'y')
    .replace(/[эЭ]/g,'e').replace(/[юЮ]/g,'yu').replace(/[яЯ]/g,'ya')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
}

export default function AdminCategoriesPage() {
  const [cats, setCats] = useState<Category[]>([])
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editImage, setEditImage] = useState('')
  const [newName, setNewName] = useState('')
  const [newImage, setNewImage] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const editFileRef = useRef<HTMLInputElement>(null)
  const newFileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/categories')
    setCats(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function uploadFile(file: File, target: 'new' | number) {
    setUploading(String(target))
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: form })
    const { url } = await res.json()
    if (target === 'new') setNewImage(url)
    else setEditImage(url)
    setUploading(null)
  }

  async function save(id: number) {
    await fetch(`/api/admin/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, slug: slugify(editName), image: editImage || null }),
    })
    setEditId(null)
    load()
  }

  async function remove(id: number, name: string) {
    if (!confirm(`Удалить категорию «${name}»? Товары в ней останутся.`)) return
    await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
    load()
  }

  async function add() {
    if (!newName.trim()) return
    await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, slug: slugify(newName), sort: cats.length, image: newImage || null }),
    })
    setNewName('')
    setNewImage('')
    load()
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Категории</h1>

      {/* Форма добавления */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6 space-y-3">
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Название новой категории"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />

        <div className="flex items-center gap-3">
          {newImage ? (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
              <Image src={newImage} alt="preview" fill className="object-cover" />
              <button onClick={() => setNewImage('')}
                className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5 text-white hover:bg-black/70">
                <X size={10} />
              </button>
            </div>
          ) : null}
          <button onClick={() => newFileRef.current?.click()}
            disabled={uploading === 'new'}
            className="flex items-center gap-2 border border-dashed border-gray-300 text-gray-500 hover:border-pink-400 hover:text-pink-500 px-3 py-2 rounded-lg text-sm transition">
            <Upload size={14} />
            {uploading === 'new' ? 'Загрузка...' : 'Добавить фото'}
          </button>
          <input ref={newFileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'new'); e.target.value = '' }} />
          <button onClick={add}
            className="ml-auto flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <Plus size={16} /> Добавить
          </button>
        </div>
      </div>

      {loading ? <div className="text-gray-400">Загрузка...</div> : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {cats.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              {editId === c.id ? (
                <div className="flex-1 space-y-2">
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && save(c.id)}
                    autoFocus
                    className="w-full border border-pink-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
                  <div className="flex items-center gap-2">
                    {editImage ? (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                        <Image src={editImage} alt="preview" fill className="object-cover" />
                        <button onClick={() => setEditImage('')}
                          className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5 text-white hover:bg-black/70">
                          <X size={10} />
                        </button>
                      </div>
                    ) : null}
                    <button onClick={() => editFileRef.current?.click()}
                      disabled={uploading === String(c.id)}
                      className="flex items-center gap-1.5 border border-dashed border-gray-300 text-gray-500 hover:border-pink-400 hover:text-pink-500 px-3 py-1.5 rounded-lg text-xs transition">
                      <Upload size={12} />
                      {uploading === String(c.id) ? 'Загрузка...' : editImage ? 'Заменить фото' : 'Добавить фото'}
                    </button>
                    <input ref={editFileRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, c.id); e.target.value = '' }} />
                    <div className="ml-auto flex gap-1">
                      <button onClick={() => save(c.id)} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg"><Check size={15} /></button>
                      <button onClick={() => setEditId(null)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg"><X size={15} /></button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-rose-50 flex items-center justify-center border border-gray-100">
                    {c.image ? (
                      <Image src={c.image} alt={c.name} width={40} height={40} className="object-cover w-full h-full" />
                    ) : (
                      <ImageOff size={16} className="text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.slug}</p>
                  </div>
                  <button onClick={() => { setEditId(c.id); setEditName(c.name); setEditImage(c.image ?? '') }}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"><Pencil size={15} /></button>
                  <button onClick={() => remove(c.id, c.name)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
