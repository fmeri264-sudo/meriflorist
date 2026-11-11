'use client'

import { useRef, useState } from 'react'
import { Download, Upload, CheckCircle, AlertCircle } from 'lucide-react'

interface Props {
  type: 'products' | 'customers' | 'orders'
  onImported?: () => void
  importDisabled?: boolean
  importLabel?: string
}

interface ImportResult {
  ok: boolean
  created?: number
  updated?: number
  errors?: number
  total?: number
  errorDetails?: string[]
  error?: string
}

export default function ExcelIO({ type, onImported, importDisabled, importLabel }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const labels: Record<Props['type'], string> = {
    products: 'товары',
    customers: 'покупателей',
    orders: 'заказы',
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setResult(null)

    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch(`/api/admin/import/${type}`, { method: 'POST', body: fd })
      const data = await res.json()
      setResult(data)
      if (data.ok) onImported?.()
    } catch {
      setResult({ ok: false, error: 'Ошибка загрузки файла' })
    }
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Скачать */}
      <a
        href={`/api/admin/export/${type}`}
        download
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition"
      >
        <Download size={15} />
        Скачать Excel
      </a>

      {/* Загрузить */}
      {!importDisabled && (
        <>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition"
          >
            <Upload size={15} />
            {importing ? 'Загрузка...' : (importLabel ?? 'Загрузить Excel')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImport}
          />
        </>
      )}

      {type === 'products' && !importDisabled && (
        <p className="w-full text-xs text-gray-500">В Excel: ID указан — обновление существующего товара; ID пустой — создание нового. Не задавайте ID новым товарам.</p>
      )}

      {/* Результат */}
      {result && (
        <div className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg ${
          result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
        }`}>
          {result.ok
            ? <CheckCircle size={14} />
            : <AlertCircle size={14} />}
          {result.ok
            ? `Готово: ${[
                result.created ? `создано ${result.created}` : '',
                result.updated ? `обновлено ${result.updated}` : '',
                result.errors ? `ошибок ${result.errors}` : '',
              ].filter(Boolean).join(', ')} из ${result.total} строк`
            : (result.error ?? 'Ошибка')}
          {result.ok && (
            <span className="text-xs text-gray-400 ml-1">
              ({labels[type]})
            </span>
          )}
        </div>
      )}
      {!!result?.errorDetails?.length && (
        <ul className="w-full list-disc pl-5 text-xs text-red-600 space-y-1" role="alert">
          {result.errorDetails.map((message, index) => <li key={index}>{message}</li>)}
        </ul>
      )}
    </div>
  )
}
