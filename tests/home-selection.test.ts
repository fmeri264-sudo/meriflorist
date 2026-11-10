import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseHomeSelection } from '../src/lib/home-selection'

test('selection starts empty and never chooses products automatically', () => {
  assert.deepEqual(parseHomeSelection('').pinnedProductIds, [])
  assert.deepEqual(parseHomeSelection('null').pinnedProductIds, [])
  assert.equal(parseHomeSelection('', 'Название из настроек').title, 'Название из настроек')
})

test('preserves administrator order, limits to four unique valid product IDs', () => {
  assert.deepEqual(parseHomeSelection(JSON.stringify({pinnedProductIds:[8,3,8,-1,'9',2.5,6,4,2]})).pinnedProductIds, [8,3,6,4])
})

test('preserves custom text and hidden state', () => {
  assert.deepEqual(parseHomeSelection(JSON.stringify({title:'Моя подборка',subtitle:'Текст',visible:false,pinnedProductIds:[4]})), {
    title:'Моя подборка',subtitle:'Текст',visible:false,pinnedProductIds:[4],
  })
})
