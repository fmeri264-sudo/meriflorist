'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Pencil, MapPin, ExternalLink } from 'lucide-react'

interface District {
  slug: string
  name: string
  h1: string
  deliveryTime: string
}

export default function AdminDistrictsPage() {
  const [districts, setDistricts] = useState<District[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/districts')
      .then(r => r.json())
      .then(data => { setDistricts(data); setLoading(false) })
  }, [])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Районы доставки</h1>
        <p className="text-gray-500 text-sm mt-0.5">SEO-страницы по районам Санкт-Петербурга</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Район</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Заголовок H1</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Время доставки</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {districts.map(d => (
                <tr key={d.slug} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={15} className="text-pink-400 shrink-0" />
                      <span className="font-medium text-gray-900">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500 max-w-xs truncate">{d.h1}</td>
                  <td className="px-5 py-3 text-gray-600">{d.deliveryTime}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/dostavka-cvetov/${d.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                        title="Открыть страницу"
                      >
                        <ExternalLink size={15} />
                      </a>
                      <Link
                        href={`/admin/districts/${d.slug}`}
                        className="p-1.5 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-lg transition"
                        title="Редактировать"
                      >
                        <Pencil size={15} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
