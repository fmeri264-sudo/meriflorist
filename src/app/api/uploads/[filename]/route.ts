import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params
  // Защита от path traversal
  if (filename.includes('..') || filename.includes('/')) {
    return new NextResponse('Not found', { status: 404 })
  }
  try {
    const filePath = join(process.cwd(), 'public', 'uploads', filename)
    const data = await readFile(filePath)
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=2592000',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
