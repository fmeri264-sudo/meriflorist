import { NextRequest, NextResponse } from 'next/server'

const MB_URL = process.env.MERIBUKET_URL ?? 'https://meribuket.ru'

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path')
  if (!path || !path.startsWith('/static/chat-photos/')) {
    return new NextResponse('forbidden', { status: 403 })
  }

  try {
    const res = await fetch(`${MB_URL}${path}`)
    if (!res.ok) return new NextResponse('not found', { status: 404 })

    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new NextResponse('error', { status: 500 })
  }
}
