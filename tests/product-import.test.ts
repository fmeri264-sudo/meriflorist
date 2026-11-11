import { test } from 'node:test'
import assert from 'node:assert/strict'
import { importProduct } from '../src/lib/import-product'

function database() {
  const rows: Record<string, unknown>[] = [{id:674,sku:'OTHER',slug:'other',name:'Другой товар'}]
  let nextId = 900
  const writes: {method:string;payload:Record<string,unknown>}[] = []
  const request = async (path: string, init?: RequestInit) => {
    const url = new URL(path,'https://example.test/')
    if (!init?.method) {
      const key = ['sku','id','slug'].find(key=>url.searchParams.has(key))!
      const value = url.searchParams.get(key)!.slice(3)
      return Response.json(rows.filter(row=>String(row[key])===value))
    }
    const payload = JSON.parse(String(init.body))
    assert.equal(Object.hasOwn(payload,'id'),false)
    writes.push({method:init.method,payload})
    if(init.method==='POST') {const row={...payload,id:nextId++};rows.push(row);return Response.json([row],{status:201})}
    const row=rows.find(row=>String(row.id)===url.searchParams.get('id')!.slice(3))!
    Object.assign(row,payload)
    return Response.json([row])
  }
  return {rows,writes,request}
}

test('new Excel ID creates with database ID; repeated import matches SKU without duplicates',async()=>{
  const db=database()
  const row={id:675,sku:'ЛВ0726',slug:'lavanda',name:'Лаванда',price:100}
  assert.equal(await importProduct(row,db.request),'created')
  assert.equal(db.rows[1].id,900)
  assert.equal(await importProduct({...row,price:200},db.request),'updated')
  assert.equal(db.rows.length,2)
  assert.equal(db.rows[1].price,200)
})

test('Excel ID collision never overwrites a different SKU',async()=>{
  const db=database()
  assert.equal(await importProduct({id:674,sku:'ЛВ0725',slug:'new',name:'Новый'},db.request),'created')
  assert.equal(db.rows[0].name,'Другой товар')
  assert.equal(db.rows[1].id,900)
})

test('existing SKU wins over stale Excel ID',async()=>{
  const db=database()
  assert.equal(await importProduct({id:50000,sku:'OTHER',slug:'other',name:'Обновление'},db.request),'updated')
  assert.equal(db.rows.length,1)
  assert.equal(db.rows[0].name,'Обновление')
})

test('blank ID and SKU match by URL on repeated import',async()=>{
  const db=database()
  const row={sku:null,slug:'new',name:'Новый'}
  assert.equal(await importProduct(row,db.request),'created')
  assert.equal(await importProduct(row,db.request),'updated')
  assert.equal(db.rows.length,2)
})

test('conflicting SKU and URL report an error without overwriting',async()=>{
  const db=database()
  await assert.rejects(importProduct({id:675,sku:'NEW',slug:'other'},db.request),/другим артикулом/)
  assert.equal(db.writes.length,0)
})

test('failed identity lookup never falls back to insertion',async()=>{
  let writes=0
  await assert.rejects(importProduct({sku:'NEW'},async(_path,init)=>{
    if(init?.method) writes++
    return Response.json({}, {status:503})
  }),/проверить/)
  assert.equal(writes,0)
})
