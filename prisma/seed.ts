/**
 * Seed скрипт: читает scripts/ym_catalog.json и заливает данные в БД.
 *
 * Запуск:
 *   npx tsx prisma/seed.ts
 *   npx tsx prisma/seed.ts --dry-run   # просмотр без записи в БД
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

config() // загружаем .env

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')

// ─── Prisma client ────────────────────────────────────────────────────────────

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as any)

// ─── Данные из JSON ───────────────────────────────────────────────────────────

interface YmProduct {
  sku: string
  name: string
  slug: string
  price: number
  description: string
  composition: string
  category_name: string
  tags: string[]
  characteristics: { name: string; value: string }[]
  images: string[]
  video: string | null
  market_url: string
  in_stock: boolean
  is_hit: boolean
  is_new: boolean
}

const CATALOG_PATH = path.join(__dirname, '..', 'scripts', 'ym_catalog.json')

// ─── Определение категорий ────────────────────────────────────────────────────

// Слова-маркеры для автоопределения категории по названию товара
const CATEGORY_RULES: [string, string[]][] = [
  ['Розы', ['роза', 'розы', 'rose']],
  ['Пионы', ['пион', 'пионы', 'peon', 'peony']],
  ['Тюльпаны', ['тюльпан', 'тюльпаны', 'tulip']],
  ['Хризантемы', ['хризантем', 'chrysanth']],
  ['Эустома', ['эустом', 'лизиантус', 'eustoma']],
  ['Гортензия', ['гортензи', 'hydrangea']],
  ['Орхидеи', ['орхид', 'orchid']],
  ['Монобукеты', ['монобукет', 'mono']],
  ['В коробке', ['коробк', 'box', 'шляп']],
  ['Смешанные', []],
]

function detectCategory(name: string, ymCategory: string): string {
  const lower = (name + ' ' + ymCategory).toLowerCase()
  for (const [catName, keywords] of CATEGORY_RULES) {
    if (keywords.some((kw) => lower.includes(kw))) return catName
  }
  return 'Смешанные'
}

// ─── Дедупликация slug ────────────────────────────────────────────────────────

function uniqueSlugs(products: YmProduct[]): Map<string, string> {
  const map = new Map<string, string>()
  const seen = new Set<string>()

  for (const p of products) {
    let slug = p.slug
    let counter = 2
    while (seen.has(slug)) {
      slug = `${p.slug}-${counter++}`
    }
    seen.add(slug)
    map.set(p.sku, slug)
  }

  return map
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(CATALOG_PATH)) {
    console.error(`❌ Файл не найден: ${CATALOG_PATH}`)
    console.error('   Сначала запустите: cd ../mary-florist && python fetch_ym_products.py')
    process.exit(1)
  }

  const raw: YmProduct[] = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'))
  console.log(`📦 Загружено из JSON: ${raw.length} товаров`)

  // Фильтруем товары без цены и без фото
  const products = raw.filter((p) => p.price > 0 && p.images.length > 0)
  console.log(`   После фильтрации (есть цена + фото): ${products.length}`)

  if (DRY_RUN) {
    console.log('\n--- DRY RUN (первые 5 товаров) ---')
    products.slice(0, 5).forEach((p) => {
      console.log(`  ${p.sku} | ${p.name} | ${p.price}₽ | фото:${p.images.length}`)
    })
    return
  }

  // ── Категории ────────────────────────────────────────────────────────────────
  const categoryNames = new Set(
    products.map((p) => detectCategory(p.name, p.category_name))
  )

  console.log('\n🗂  Категории:', [...categoryNames].join(', '))

  const categoryMap = new Map<string, number>()
  let sortIdx = 0
  for (const name of categoryNames) {
    const slug = name
      .toLowerCase()
      .replace(/[^а-яa-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')

    const cat = await prisma.category.upsert({
      where: { slug },
      create: { name, slug, sort: sortIdx++ },
      update: { name },
    })
    categoryMap.set(name, cat.id)
  }

  // ── Товары ───────────────────────────────────────────────────────────────────
  const slugMap = uniqueSlugs(products)
  let created = 0
  let updated = 0
  let failed = 0

  for (const p of products) {
    const catName = detectCategory(p.name, p.category_name)
    const categoryId = categoryMap.get(catName)!
    const slug = slugMap.get(p.sku)!

    // composition: либо из поля, либо первые 200 символов описания
    const composition = p.composition || p.description.slice(0, 200) || undefined

    const data = {
      name: p.name,
      slug,
      description: p.description || null,
      composition: composition || null,
      price: p.price,
      images: p.images,
      video: p.video || null,
      inStock: p.in_stock,
      isHit: p.is_hit,
      isNew: p.is_new,
      tags: p.tags,
      categoryId,
    }

    try {
      const existing = await prisma.product.findUnique({ where: { slug } })
      if (existing) {
        await prisma.product.update({ where: { slug }, data })
        updated++
      } else {
        await prisma.product.create({ data })
        created++
      }
    } catch (e) {
      console.error(`  ⚠ Ошибка для ${p.sku} (${p.name}): ${e}`)
      failed++
    }
  }

  console.log(`\n✅ Готово!`)
  console.log(`   Создано:  ${created}`)
  console.log(`   Обновлено: ${updated}`)
  console.log(`   Ошибок:   ${failed}`)

  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
