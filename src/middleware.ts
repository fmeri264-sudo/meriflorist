import { NextRequest, NextResponse } from 'next/server'

async function getAdminToken(): Promise<string> {
  const password = process.env.ADMIN_PASSWORD ?? 'admin123'
  const data = new TextEncoder().encode(password + 'meriflorist-2026')
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const cookie = request.cookies.get('admin_session')
    const token = await getAdminToken()
    if (!cookie || cookie.value !== token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
