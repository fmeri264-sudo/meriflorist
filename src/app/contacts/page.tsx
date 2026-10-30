import { getSettings } from '@/lib/settings'

export const revalidate = 60

export default async function ContactsPage() {
  const s = await getSettings()

  const paragraphs = s.pageContacts
    ? s.pageContacts.split(/\n\n+/).filter(Boolean)
    : null

  const phoneClean = s.phone.replace(/\D/g, '')

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Контакты</h1>

      {paragraphs ? (
        <div className="prose prose-gray max-w-none space-y-4 mb-8">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-gray-700 leading-relaxed whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-gray-500 w-28 text-sm">Телефон:</span>
          <a href={`tel:+${phoneClean}`} className="text-rose-500 font-medium hover:underline">
            {s.phone}
          </a>
        </div>

        {s.whatsapp && (
          <div className="flex items-center gap-3">
            <span className="text-gray-500 w-28 text-sm">WhatsApp:</span>
            <a href={s.whatsapp} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
              Написать
            </a>
          </div>
        )}

        {s.telegram && (
          <div className="flex items-center gap-3">
            <span className="text-gray-500 w-28 text-sm">Telegram:</span>
            <a href={s.telegram} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              Написать
            </a>
          </div>
        )}

        {s.vk && (
          <div className="flex items-center gap-3">
            <span className="text-gray-500 w-28 text-sm">ВКонтакте:</span>
            <a href={s.vk} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
              Перейти
            </a>
          </div>
        )}

        {s.max && (
          <div className="flex items-center gap-3">
            <span className="text-gray-500 w-28 text-sm">MAX:</span>
            <a href={s.max} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
              Написать
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
