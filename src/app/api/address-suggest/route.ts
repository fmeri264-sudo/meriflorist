import { NextRequest, NextResponse } from 'next/server'

const GEOCODER_TOKEN = process.env.YANDEX_GEOCODER_TOKEN ?? ''

interface Suggestion {
  fullname: string  // "проспект Испытателей, 33"
  description: string  // "Санкт-Петербург"
  street: string
  house: string
}

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q') ?? ''
  if (!q || q.length < 3) return NextResponse.json([])

  if (!GEOCODER_TOKEN || GEOCODER_TOKEN === 'your_geocoder_token') {
    return NextResponse.json([])
  }

  try {
    const query = q.toLowerCase().startsWith('санкт') ? q : `Санкт-Петербург, ${q}`
    const url = `https://geocode-maps.yandex.ru/1.x/?format=json&apikey=${GEOCODER_TOKEN}&geocode=${encodeURIComponent(query)}&results=6&lang=ru_RU&rspn=1&bbox=29.4,59.6~31.0,60.3&kind=house,street`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json([])

    const data = await res.json()
    const members = data?.response?.GeoObjectCollection?.featureMember ?? []

    const suggestions: Suggestion[] = []
    for (const m of members) {
      const obj = m?.GeoObject
      if (!obj) continue

      const components: { kind: string; name: string }[] =
        obj?.metaDataProperty?.GeocoderMetaData?.Address?.Components ?? []

      const street = components.find(c => ['street', 'route'].includes(c.kind))?.name ?? ''
      const house = components.find(c => c.kind === 'house')?.name ?? ''

      if (!street) continue

      suggestions.push({
        fullname: obj.name ?? street,
        description: obj.description ?? 'Санкт-Петербург',
        street,
        house,
      })
    }

    return NextResponse.json(suggestions)
  } catch {
    return NextResponse.json([])
  }
}
