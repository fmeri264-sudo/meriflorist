import { getSettings } from '@/lib/settings'

export const revalidate = 60

export default async function DeliveryPage() {
  const s = await getSettings()

  const paragraphs = s.pageDelivery
    ? s.pageDelivery.split(/\n\n+/).filter(Boolean)
    : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Доставка и оплата</h1>

      {paragraphs ? (
        <div className="prose prose-gray max-w-none space-y-4">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-gray-700 leading-relaxed whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
      ) : (
        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Доставка</h2>
            <p>Доставляем цветы по Санкт-Петербургу ежедневно с 8:00 до 23:00.</p>
            <p className="mt-2">Стоимость доставки рассчитывается при оформлении заказа в зависимости от адреса.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Самовывоз</h2>
            <p>Вы можете забрать заказ самостоятельно. Адрес уточняйте по телефону.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Оплата</h2>
            <p>Принимаем оплату онлайн картой при оформлении заказа, а также наличными при получении.</p>
          </section>
        </div>
      )}
    </div>
  )
}
