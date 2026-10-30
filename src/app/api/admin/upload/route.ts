import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import sharp from 'sharp'

// Используем API-маршрут для раздачи файлов — работает без nginx и без кэша Next.js
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://meriflorist.ru'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'Файл не передан' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const uploadDir = join(process.cwd(), 'public', 'uploads')

  try {
    const converted = await sharp(buffer)
      .rotate()
      .jpeg({ quality: 88 })
      .toBuffer()
    await writeFile(join(uploadDir, filename), converted)
  } catch {
    const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const fallbackName = filename.replace('.jpg', `.${ext}`)
    await writeFile(join(uploadDir, fallbackName), buffer)
    return NextResponse.json({ url: `${SITE_URL}/api/uploads/${fallbackName}` })
  }

  return NextResponse.json({ url: `${SITE_URL}/api/uploads/${filename}` })
}
