import { NextResponse } from 'next/server'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://meriflorist.ru'

export async function GET() {
  // Все статические страницы из папки src/app/
  const pages = [
    '', // главная
    'account',
    'blog',
    'catalog',
    'consent',
    'contacts',
    'delivery',
    'dostavka-cvetov',
    'oferta',
    'order-success',
    'pages',
    'privacy',
    'reviews',
    'rules',
    'vozvrat'
  ]

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

  for (const page of pages) {
    const url = page === '' ? baseUrl : `${baseUrl}/${page}`
    const priority = page === '' ? '1.0' : '0.8'
    const changefreq = page === '' ? 'daily' : 'weekly'
    
    xml += '  <url>\n'
    xml += `    <loc>${url}</loc>\n`
    xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`
    xml += `    <changefreq>${changefreq}</changefreq>\n`
    xml += `    <priority>${priority}</priority>\n`
    xml += '  </url>\n'
  }

  xml += '</urlset>'

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
