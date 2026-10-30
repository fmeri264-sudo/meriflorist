import type { Page } from './pages'

export type BlogSummary = Pick<Page, 'id'|'slug'|'title'|'metaDescription'|'customPath'|'createdAt'> & { category?: string | null; blocks?: Array<{ type?: string; content?: string; title?: string }> }

const TAG_RULES: Array<[string, string[]]> = [
  ['розы', ['роза','розы','роз']], ['букеты', ['букет','букеты']],
  ['доставка цветов', ['доставк','курьер']], ['подарки', ['подар','подарок']],
  ['уход за цветами', ['уход','свежест','вода']], ['праздники', ['8 марта','день рождения','юбиле','праздник','новый год']],
  ['акции', ['акци','скидк','выгод']], ['цветы', ['цвет','флорист','композици']],
]

export function getBlogTags(page: Pick<BlogSummary, 'title'|'metaDescription'|'category'|'blocks'>): string[] {
  const text = [page.title, page.metaDescription, page.category, ...(page.blocks ?? []).map(b => 'content' in b ? b.content : 'title' in b ? b.title : '')].filter(Boolean).join(' ').toLowerCase()
  const tags = TAG_RULES.filter(([, words]) => words.some(word => text.includes(word))).map(([tag]) => tag)
  if (page.category === 'events') tags.push('события')
  if (page.category === 'news') tags.push('новости')
  if (page.category === 'tips') tags.push('советы')
  return [...new Set(tags)].slice(0, 6)
}

export function getBlogUrl(page: Pick<BlogSummary, 'slug'|'customPath'>) {
  return page.customPath ? `/${page.customPath}` : `/pages/${page.slug}`
}

export function getRelatedBlogs(page: BlogSummary, pages: BlogSummary[], limit = 3) {
  const tags = new Set(getBlogTags(page))
  return pages.filter(other => other.id !== page.id)
    .map(other => ({ page: other, score: getBlogTags(other).filter(tag => tags.has(tag)).length + (other.category && other.category === page.category ? 1 : 0) }))
    .filter(item => item.score > 0).sort((a, b) => b.score - a.score || b.page.createdAt.localeCompare(a.page.createdAt)).slice(0, limit).map(item => item.page)
}
