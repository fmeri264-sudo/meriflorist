import { test, before, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { CheckoutError, normalizePromoCode, parsePromoCode, promoDiscount, calculateTotals, type PromoCode } from '../src/lib/promocodes'
import { customerPhoneVariants, priceCheckoutItems } from '../src/lib/checkout-pricing'
import { NextRequest } from 'next/server'

process.env.SUPABASE_URL = 'https://database.test'
process.env.SUPABASE_ANON_KEY = 'test-public-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-private-key'
process.env.ADMIN_PASSWORD = 'test-admin-password'
process.env.TBANK_TERMINAL_KEY = 'test-terminal'
process.env.TBANK_TERMINAL_PASSWORD = 'test-password'
const originalFetch = globalThis.fetch
let orderPost: typeof import('../src/app/api/orders/route').POST
let validatePost: typeof import('../src/app/api/promocodes/validate/route').POST
let adminGet: typeof import('../src/app/api/admin/promocodes/route').GET
let adminPost: typeof import('../src/app/api/admin/promocodes/route').POST
let adminPut: typeof import('../src/app/api/admin/promocodes/[id]/route').PUT
let adminDelete: typeof import('../src/app/api/admin/promocodes/[id]/route').DELETE
let getAdminToken: typeof import('../src/lib/admin-auth').getAdminToken
let requirePromoAdmin: typeof import('../src/lib/promo-store').requirePromoAdmin
before(async () => {
  orderPost = (await import('../src/app/api/orders/route')).POST
  validatePost = (await import('../src/app/api/promocodes/validate/route')).POST
  const collection = await import('../src/app/api/admin/promocodes/route')
  adminGet = collection.GET
  adminPost = collection.POST
  const detail = await import('../src/app/api/admin/promocodes/[id]/route')
  adminPut = detail.PUT
  adminDelete = detail.DELETE
  getAdminToken = (await import('../src/lib/admin-auth')).getAdminToken
  requirePromoAdmin = (await import('../src/lib/promo-store')).requirePromoAdmin
})

afterEach(() => { globalThis.fetch = originalFetch })

const promo: PromoCode = { id: 1, code: 'FLOWERS10', name: 'Акция', discountType: 'percent', discountValue: 10, isActive: true }
const product = { id: 7, name: 'Букет', price: 5690, priceL: 6500, inStock: true, isVisible: true, images: ['/flowers.jpg'], sku: 'K1' }
const body = { recipientName: 'Test', recipientPhone: '+79001234567', selfPickup: false, address: 'Test address',
  deliveryCost: 300, paymentMethod: 'ONLINE', subtotal: 5690, total: 1, bonusUsed: 0, promoCode: ' flowers10 ',
  items: [{ productId: 7, size: 'M', qty: 1, price: 1, name: 'Forged title' }] }
function request(data: unknown, url = '/api/orders', headers: Record<string, string> = {}) {
  return new NextRequest(`https://shop.test${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data) })
}
function mockDb(options: { promo?: PromoCode | null; bankFails?: boolean; bonuses?: number } = {}) {
  const calls: { url: URL; method: string; body: Record<string, unknown> | null }[] = []
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input))
    const data = init?.body ? JSON.parse(String(init.body)) : null
    calls.push({ url, method: init?.method ?? 'GET', body: data })
    if (url.pathname.endsWith('/Product')) return Response.json([product])
    if (url.pathname.endsWith('/PromoCode')) {
      assert.equal((init?.headers as Record<string, string>).apikey, 'test-private-key')
      return Response.json(options.promo === null ? [] : [options.promo ?? promo])
    }
    if (url.pathname.endsWith('/Customer')) return Response.json([{ id: 3, bonuses: options.bonuses ?? 1000 }])
    if (url.pathname.endsWith('/Order')) return Response.json([{ id: 25, number: 'TEST-25' }])
    if (url.pathname.endsWith('/OrderItem')) return new Response(null, { status: 201 })
    if (url.hostname === 'securepay.tinkoff.ru') return Response.json(options.bankFails
      ? { Success: false, Message: 'Test rejected' } : { Success: true, PaymentURL: 'https://bank.test/pay/25', PaymentId: '25' })
    throw new Error(`Unexpected request: ${url.hostname}${url.pathname}`)
  }
  return calls
}

test('normalizes code case and spaces, rejects query injection', () => {
  assert.equal(normalizePromoCode('  flowers10 '), 'FLOWERS10')
  assert.equal(normalizePromoCode(' весна-15 '), 'ВЕСНА-15')
  for (const invalid of ['', 'A', 'CODE&isActive=eq.false', null, 'A'.repeat(41)]) assert.throws(() => normalizePromoCode(invalid), CheckoutError)
})
test('validates admin rules, percentages, fixed amount and active flag', () => {
  assert.equal(parsePromoCode(promo).discountValue, 10)
  for (const invalid of [null, {}, { ...promo, discountValue: 101 }, { ...promo, discountValue: -1 },
    { ...promo, discountValue: 1.5 }, { ...promo, discountType: 'other' }, { ...promo, isActive: 'true' }]) {
    assert.throws(() => parsePromoCode(invalid), CheckoutError)
  }
})
test('percent and fixed discounts are rounded in rubles and never exceed merchandise cost', () => {
  assert.equal(promoDiscount(promo, 5690), 569)
  assert.equal(promoDiscount({ ...promo, discountValue: 15 }, 999), 150)
  assert.equal(promoDiscount({ ...promo, discountType: 'fixed', discountValue: 500 }, 5690), 500)
  assert.equal(promoDiscount({ ...promo, discountType: 'fixed', discountValue: 10000 }, 5690), 5690)
  assert.throws(() => promoDiscount({ ...promo, isActive: false }, 5690))
})
test('promo does not discount delivery; bonuses cannot be stacked and cannot exceed balance', () => {
  assert.equal(calculateTotals(5690, 300, 569, 0, 1000).total, 5421)
  assert.equal(calculateTotals(5690, 300, 5690, 0, 0).total, 300)
  assert.equal(calculateTotals(100, 0, 0, 200, 150).total, 0)
  assert.throws(() => calculateTotals(1000, 0, 100, 1, 1000), /Выберите/)
})
test('phone variants match checkout ten digits, +7 and 8 records', () => {
  assert.deepEqual(customerPhoneVariants('9001234567'), customerPhoneVariants('+79001234567'))
  assert.deepEqual(customerPhoneVariants('89001234567'), customerPhoneVariants('+79001234567'))
})
test('server uses product price and validates quantities and availability', async () => {
  const db = async () => Response.json([product])
  assert.equal((await priceCheckoutItems([{ productId: 7, size: 'L', qty: 2, price: 1 }], db))[0].price, 6500)
  await assert.rejects(priceCheckoutItems([{ productId: 7, size: 'M', qty: -1 }], db))
  await assert.rejects(priceCheckoutItems([{ productId: 7, size: 'M', qty: 1 }], async () => Response.json([])))
})
test('checkout preview validates code and calculates discount from catalog, not posted prices', async () => {
  mockDb()
  const res = await validatePost(request({ code: ' flowers10 ', items: body.items }, '/api/promocodes/validate'))
  assert.equal(res.status, 200)
  const data = await res.json()
  assert.equal(data.subtotal, 5690)
  assert.equal(data.discount, 569)
  assert.equal(data.code, 'FLOWERS10')
})
test('inactive/deleted code is rejected again at order submission without creating order or payment', async () => {
  const calls = mockDb({ promo: null })
  const res = await orderPost(request(body))
  assert.equal(res.status, 400)
  assert.ok(!calls.some(c => c.url.pathname.endsWith('/Order') || c.url.hostname === 'securepay.tinkoff.ru'))
})
test('payment and stored order have the same trusted discounted amount; snapshot is stored', async () => {
  const calls = mockDb()
  const res = await orderPost(request(body))
  assert.equal(res.status, 200)
  const data = await res.json()
  assert.equal(data.total, 5421)
  assert.equal(data.paymentUrl, 'https://bank.test/pay/25')
  const saved = calls.find(c => c.url.pathname.endsWith('/Order'))!.body!
  assert.equal(saved.totalAmount, 5421)
  assert.equal(saved.promoCode, 'FLOWERS10')
  assert.equal(saved.promoDiscount, 569)
  const bank = calls.find(c => c.url.hostname === 'securepay.tinkoff.ru')!.body!
  assert.equal(bank.Amount, 542100)
  const receipt = bank.Receipt as { Items: { Amount: number }[] }
  assert.equal(receipt.Items.reduce((sum, i) => sum + i.Amount, 0), bank.Amount)
})
test('forged subtotal is rejected before payment', async () => {
  const calls = mockDb()
  assert.equal((await orderPost(request({ ...body, subtotal: 1 }))).status, 409)
  assert.ok(!calls.some(c => c.url.pathname.endsWith('/Order')))
})
test('promo plus bonuses is rejected, including a promo yielding zero discount', async () => {
  mockDb()
  assert.equal((await orderPost(request({ ...body, bonusUsed: 1 }))).status, 400)
})
test('bonus-only checkout validates balance and preserves deduction without promo', async () => {
  const calls = mockDb({ bonuses: 1000 })
  const res = await orderPost(request({ ...body, promoCode: null, bonusUsed: 1000 }))
  assert.equal(res.status, 200)
  assert.equal((await res.json()).total, 4990)
  assert.equal(calls.find(c => c.method === 'PATCH' && c.url.pathname.endsWith('/Customer'))!.body!.bonuses, 0)
})
test('stale bonus balance cannot silently increase the amount to pay', async () => {
  const calls = mockDb({ bonuses: 100 })
  assert.equal((await orderPost(request({ ...body, promoCode: null, bonusUsed: 1000 }))).status, 409)
  assert.ok(!calls.some(c => c.url.pathname.endsWith('/Order')))
})
test('failed payment initialization does not spend customer bonuses', async () => {
  const calls = mockDb({ bankFails: true })
  assert.equal((await orderPost(request({ ...body, promoCode: null, bonusUsed: 100 }))).status, 502)
  assert.ok(!calls.some(c => c.method === 'PATCH' && c.url.pathname.endsWith('/Customer')))
})
test('fixed discount is capped at merchandise and can create a zero-total paid pickup order', async () => {
  const calls = mockDb({ promo: { ...promo, discountType: 'fixed', discountValue: 10000 } })
  const res = await orderPost(request({ ...body, selfPickup: true }))
  assert.equal(res.status, 200)
  assert.equal((await res.json()).total, 0)
  assert.equal(calls.find(c => c.url.pathname.endsWith('/Order'))!.body!.paymentStatus, 'PAID')
  assert.ok(!calls.some(c => c.url.hostname === 'securepay.tinkoff.ru'))
})
test('admin endpoints reject unauthenticated reads and writes without database access', async () => {
  let called = false
  globalThis.fetch = async () => { called = true; throw new Error('Unexpected DB access') }
  assert.equal((await adminGet(new NextRequest('https://shop.test/api/admin/promocodes'))).status, 401)
  assert.equal((await adminPost(request(promo))).status, 401)
  assert.equal(called, false)
})
test('admin mutations reject foreign origins but accept configured reverse proxy origin', async () => {
  const token = await getAdminToken()
  await assert.rejects(requirePromoAdmin(request(promo, '/api/admin/promocodes', {
    Cookie: `admin_session=${token}`, Origin: 'https://foreign.test',
  })), /источник/)
})
test('admin can create, edit, toggle and delete codes; duplicates report a useful error', async () => {
  const cookie = `admin_session=${await getAdminToken()}`
  const methods: string[] = []
  globalThis.fetch = async (_input, init) => {
    methods.push(init?.method ?? 'GET')
    return Response.json([promo])
  }
  assert.equal((await adminPost(request(promo, '/api/admin/promocodes', { Cookie: cookie }))).status, 201)
  const context = { params: Promise.resolve({ id: '1' }) }
  assert.equal((await adminPut(request({ ...promo, isActive: false }, '/api/admin/promocodes/1', { Cookie: cookie }), context)).status, 200)
  assert.equal((await adminDelete(request({}, '/api/admin/promocodes/1', { Cookie: cookie }), context)).status, 200)
  assert.deepEqual(methods, ['POST', 'PATCH', 'DELETE'])
  globalThis.fetch = async () => Response.json({ code: '23505' }, { status: 409 })
  assert.equal((await adminPost(request(promo, '/api/admin/promocodes', { Cookie: cookie }))).status, 409)
})
