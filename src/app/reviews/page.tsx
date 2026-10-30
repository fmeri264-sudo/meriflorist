import ReviewsClient from './ReviewsClient'
import { attachReviewProductLinks, type DbReview } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!

async function getAllReviews() {
  try {
    const reviews: DbReview[] = []
    for (let offset = 0; ; offset += 1000) {
      const res = await fetch(
        `${SB}/rest/v1/SiteReview?visible=eq.true&order=createdAt.desc,id.desc&limit=1000&offset=${offset}`,
        {
          headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
          cache: 'no-store', signal: AbortSignal.timeout(30_000),
        }
      )
      if (!res.ok) throw new Error(`Не удалось загрузить отзывы: HTTP ${res.status}`)
      const page: DbReview[] = await res.json()
      reviews.push(...page)
      if (page.length < 1000) break
    }
    return await attachReviewProductLinks(reviews)
  } catch {
    return []
  }
}

export const metadata = {
  title: 'Отзывы — Meri Florist',
  description: 'Отзывы покупателей о цветочном магазине Meri Florist. Реальные отзывы с Яндекс Маркет, Ozon и Wildberries.',
}

export default async function ReviewsPage() {
  const reviews = await getAllReviews()

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Отзывы</h1>
          <p className="text-gray-500">
            Реальные отзывы покупателей с маркетплейсов и нашего магазина
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {reviews.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">🌸</p>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Отзывов пока нет</h2>
            <p className="text-gray-400 text-sm">
              Загрузите отзывы с маркетплейсов в{' '}
              <a href="/admin/reviews" className="text-rose-500 hover:underline">админ-панели</a>
            </p>
          </div>
        ) : (
          <ReviewsClient reviews={reviews} />
        )}
      </div>
    </main>
  )
}
