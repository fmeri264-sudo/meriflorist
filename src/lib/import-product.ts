type Row = Record<string, unknown>
type Request = (path: string, init?: RequestInit) => Promise<Response>
interface Match { id: number; sku: string | null; slug: string }

export async function importProduct(row: Row, request: Request): Promise<'created' | 'updated'> {
  const { id, ...payload } = row
  const sku = typeof payload.sku === 'string' ? payload.sku.trim() : ''
  const slug = String(payload.slug ?? '')
  async function find(filter: string): Promise<Match | undefined> {
    const response = await request(`Product?${filter}&select=id,sku,slug&limit=2`)
    if (!response.ok) throw new Error('Не удалось проверить существующие товары. Запись пропущена.')
    const records = await response.json() as Match[]
    if (records.length > 1) throw new Error('Найдено несколько товаров с одинаковым артикулом или URL. Устраните дубли.')
    return records[0]
  }
  // SKU is the stable external identifier; Excel IDs may belong to another database.
  let match = sku ? await find(`sku=eq.${encodeURIComponent(sku)}`) : undefined
  if (!match && id) {
    const byId = await find(`id=eq.${id}`)
    if (byId && (!sku || byId.sku === sku || (!byId.sku && byId.slug === slug))) match = byId
  }
  if (!match && slug) {
    const bySlug = await find(`slug=eq.${encodeURIComponent(slug)}`)
    if (bySlug && sku && bySlug.sku && bySlug.sku !== sku) {
      throw new Error('URL уже занят товаром с другим артикулом. Укажите отдельный URL.')
    }
    match = bySlug
  }
  const response = await request(match ? `Product?id=eq.${match.id}&select=id` : 'Product', {
    method: match ? 'PATCH' : 'POST',
    headers: { Prefer: 'return=representation' },
    // Never insert an explicit database ID, including when the Excel ID is unknown.
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}))
    if (detail.code === '23505' && detail.message?.includes('Product_pkey')) {
      throw new Error('Счётчик ID в Supabase отстаёт от каталога. Требуется синхронизация счётчика.')
    }
    throw new Error(`База отклонила сохранение (код ${detail.code ?? response.status}). Проверьте URL и обязательные поля.`)
  }
  const saved = await response.json()
  if (!Array.isArray(saved) || saved.length !== 1) throw new Error('База не подтвердила сохранение товара. Проверьте каталог.')
  return match ? 'updated' : 'created'
}
