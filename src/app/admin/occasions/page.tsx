'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'

interface Occasion {
  id: number
  name: string
  slug: string
  sort: number
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
    .replace(/[яЯ]/g, 'ya').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function AdminOccasionsPage() {
  const [occasions, setOccasions] = useState<Occasion[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Occasion | null>(null)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/occasions')
    setOccasions(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function add() {
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    await fetch('/api/admin/occasions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug: slugify(name), sort: occasions.length }),
    })
    setNewName('')
    setAdding(false)
    load()
  }

  async function saveEdit() {
    if (!editing) return
    await fetch(`/api/admin/occasions/${editing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editing.name, slug: editing.slug }),
    })
    setEditing(null)
    load()
  }

  async function remove(id: number, name: string) {
    if (!confirm(`Удалить повод «${name}»?`)) return
    await fetch(`/api/admin/occasions/${id}`, { method: 'DELETE' })
    load()
  }

  const inp = 'border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400'

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Поводы</h1>

      <div className="flex gap-2 mb-6">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Название повода..."
          className={inp + ' flex-1'}
        />
        <button
          onClick={add}
          disabled={adding || !newName.trim()}
          className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
        >
          <Plus size={16} /> Добавить
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Загрузка...</div>
      ) : (
        <div className="space-y-2">
          {occasions.map(o => (
            <div key={o.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
              {editing?.id === o.id ? (
                <div className="flex gap-2 items-center">
                  <input
                    value={editing.name}
                    onChange={e => setEditing({ ...editing, name: e.target.value, slug: slugify(e.target.value) })}
                    className={inp + ' flex-1'}
                    autoFocus
                  />
                  <span className="text-xs text-gray-400 shrink-0">{editing.slug}</span>
                  <button onClick={saveEdit} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition"><Check size={15} /></button>
                  <button onClick={() => setEditing(null)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg transition"><X size={15} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{o.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{o.slug}</span>
                  </div>
                  <button onClick={() => setEditing(o)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"><Pencil size={15} /></button>
                  <button onClick={() => remove(o.id, o.name)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
                </div>
              )}
            </div>
          ))}
          {!occasions.length && <p className="text-gray-400 text-sm">Поводов пока нет</p>}
        </div>
      )}
    </div>
  )
}
