export const HOME_SELECTION_ID = -1
export const HOME_SELECTION_LIMIT = 4

export interface HomeSelectionConfig {
  title: string
  subtitle: string
  visible: boolean
  pinnedProductIds: number[]
}

export function parseHomeSelection(value: string, title = 'Выбор Мэри'): HomeSelectionConfig {
  const defaults: HomeSelectionConfig = {
    title, subtitle: 'Для особого повода и просто так', visible: true, pinnedProductIds: [],
  }
  try {
    const data = JSON.parse(value)
    if (!data || typeof data !== 'object') return defaults
    return {
      title: typeof data.title === 'string' ? data.title : title,
      subtitle: typeof data.subtitle === 'string' ? data.subtitle : defaults.subtitle,
      visible: typeof data.visible === 'boolean' ? data.visible : true,
      pinnedProductIds: Array.isArray(data.pinnedProductIds)
        ? [...new Set<number>(data.pinnedProductIds.filter((id: unknown) => typeof id === 'number' && Number.isSafeInteger(id) && id > 0))].slice(0, HOME_SELECTION_LIMIT)
        : [],
    }
  } catch { return defaults }
}
