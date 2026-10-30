import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Если есть страницы, которые не нужно индексировать, раскомментируйте:
      // disallow: ['/admin/', '/checkout/', '/cart/'],
    },
    sitemap: 'https://meriflorist.ru/sitemap.xml',
  }
}
