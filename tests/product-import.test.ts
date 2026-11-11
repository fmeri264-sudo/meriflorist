import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { NextRequest } from 'next/server'
import { POST } from '../src/app/api/admin/import/[type]/route'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

function request(rows: object[]) {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Товары')
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))]), 'products.xlsx')
  return new NextRequest('http://localhost/api/admin/import/products', { method: 'POST', body: form })
}

test('existing IDs only update; missing IDs never insert; blank IDs use database defaults', async () => {
  const writes: {method: string; url: string; payload: Record<string, unknown>}[] = []
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    if (!init?.method) return Response.json([{id:1,name:'Розы'}])
    const payload = JSON.parse(String(init.body))
    writes.push({method:init.method,url,payload})
    assert.equal(Object.hasOwn(payload,'id'),false)
    if (init.method === 'PATCH') return Response.json(url.includes('id=eq.10&') ? [{id:10}] : [])
    assert.equal(init.method,'POST')
    assert.equal(url.includes('on_conflict'),false)
    return new Response(null,{status:201})
  }
  const response = await POST(request([
    {ID:10,Название:'Обновление'}, {ID:50000,Название:'Несуществующий'}, {ID:'',Название:'Новый'},
    {ID:'abc',Название:'Неверный ID'}, {ID:1.5,Название:'Дробный ID'},
  ]),{params:Promise.resolve({type:'products'})})
  const result = await response.json()
  assert.equal(result.updated,1)
  assert.equal(result.created,1)
  assert.equal(result.errors,3)
  assert.equal(writes.filter(w=>w.method==='POST').length,1)
  assert.match(result.errorDetails.join(' '),/очистите ID/)
})

test('a failed update is counted as an error without falling back to insert', async () => {
  let posts = 0
  globalThis.fetch = async (_input, init) => {
    if (!init?.method) return Response.json([{id:1,name:'Розы'}])
    if(init.method==='POST') posts++
    return Response.json({error:'failed'},{status:500})
  }
  const response = await POST(request([{ID:10,Название:'Товар'}]),{params:Promise.resolve({type:'products'})})
  const result = await response.json()
  assert.equal(result.updated,0)
  assert.equal(result.errors,1)
  assert.equal(posts,0)
})
