/**
 * Заливка 620 товаров в Supabase через REST API.
 * Не требует прямого подключения к PostgreSQL.
 *
 * Запуск: node scripts/seed-via-api.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://gflxlbiyghvlngfoyrxk.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmbHhsYml5Z2h2bG5nZm95cnhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MTY0NDYsImV4cCI6MjA5MzM5MjQ0Nn0.q3U3ddgBw4dkEil-7-y1ak9qmvyd8me9VYSK_7LYGJk'

const HEADERS = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiPost(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${table} POST ${res.status}: ${text.slice(0, 200)}`)
  }
}

async function apiGet(table, select = '*') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${select}`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` },
  })
  if (!res.ok) throw new Error(`GET ${table}: ${res.status}`)
  return res.json()
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^а-яa-z0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

function detectCategory(name, ymCat) {
  const s = (name + ' ' + ymCat).toLowerCase()
  if (/пион/.test(s)) return 'Пионовые розы'
  if (/тюльпан/.test(s)) return 'Тюльпаны'
  if (/роза|розы/.test(s)) return 'Розы'
  if (/хризантем/.test(s)) return 'Хризантемы'
  if (/эустом|лизиантус/.test(s)) return 'Эустома'
  if (/гортензи/.test(s)) return 'Гортензия'
  if (/орхид/.test(s)) return 'Орхидеи'
  if (/монобукет/.test(s)) return 'Монобукеты'
  if (/коробк|box/.test(s)) return 'В коробке'
  return 'Смешанные'
}

function chunkArray(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const catalogPath = path.join(__dirname, 'ym_catalog.json')
const raw = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'))

// Фильтр: только товары с ценой и фото
const products = raw.filter(p => p.price > 0 && p.images?.length > 0)
console.log(`📦 Товаров к загрузке: ${products.length}`)

// ── 1. Категории ──────────────────────────────────────────────────────────────
const catNames = [...new Set(products.map(p => detectCategory(p.name, p.category_name)))]
const categoryRows = catNames.map((name, i) => ({
  name,
  slug: slugify(name),
  sort: i,
}))

console.log(`\n🗂  Создаю ${categoryRows.length} категорий...`)
try {
  await apiPost('Category', categoryRows)
  console.log('   ✅ Категории созданы')
} catch (e) {
  if (e.message.includes('duplicate') || e.message.includes('already exists') || e.message.includes('23505')) {
    console.log('   ⚠️  Категории уже существуют, пропускаю')
  } else {
    console.error('   ❌', e.message)
    process.exit(1)
  }
}

// Получаем id категорий
const cats = await apiGet('Category', 'id,name')
const catMap = Object.fromEntries(cats.map(c => [c.name, c.id]))
console.log(`   Категорий в БД: ${cats.length}`)

// ── 2. Товары ─────────────────────────────────────────────────────────────────
console.log(`\n🌸 Заливаю товары...`)

// Дедупликация slug
const seenSlugs = new Set()
const productRows = products.map(p => {
  const catName = detectCategory(p.name, p.category_name)
  let slug = slugify(p.name) + '-' + p.sku.toLowerCase()
  let counter = 2
  while (seenSlugs.has(slug)) slug = slugify(p.name) + '-' + p.sku.toLowerCase() + '-' + counter++
  seenSlugs.add(slug)

  return {
    name: p.name,
    slug,
    description: p.description || null,
    composition: p.composition || null,
    price: p.price,
    images: p.images,
    video: p.video || null,
    inStock: true,
    isHit: false,
    isNew: false,
    tags: p.tags || [],
    categoryId: catMap[catName],
  }
}).filter(p => p.categoryId) // только с известной категорией

// Заливаем батчами по 50 (лимит Supabase REST)
const batches = chunkArray(productRows, 50)
let done = 0
let errors = 0

for (let i = 0; i < batches.length; i++) {
  const batch = batches[i]
  try {
    await apiPost('Product', batch)
    done += batch.length
    process.stdout.write(`\r   Загружено: ${done}/${productRows.length}...`)
  } catch (e) {
    if (e.message.includes('23505')) {
      // Дубликат slug — пропускаем
      done += batch.length
    } else {
      console.error(`\n   ❌ Батч ${i + 1}: ${e.message}`)
      errors++
    }
  }
  // Небольшая пауза чтобы не перегрузить API
  await new Promise(r => setTimeout(r, 100))
}

console.log(`\n\n✅ Готово!`)
console.log(`   Товаров залито: ${done}`)
if (errors > 0) console.log(`   Ошибок: ${errors}`)
console.log(`\nСайт готов к запуску: npm run dev`)
