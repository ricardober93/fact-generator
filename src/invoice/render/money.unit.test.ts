import assert from 'node:assert/strict'
import test from 'node:test'
import { grandTotal, lineAmount, sumAmounts } from './money'

test('a line amount is quantity times price', () => {
  assert.equal(lineAmount(3, 25), 75)
  assert.equal(lineAmount(1, 0.1), 0.1)
})

test('cents do not drift the way floats do', () => {
  assert.equal(sumAmounts([0.1, 0.2]), 0.3)
  assert.equal(0.1 + 0.2 === 0.3, false)
  assert.equal(sumAmounts([70.15, 25.35, 4.5]), 100)
  assert.equal(grandTotal(0.1, 0.2), 0.3)
})

test('a fractional quantity rounds to the cent', () => {
  assert.equal(lineAmount(2.5, 10.01), 25.03)
  assert.equal(lineAmount(0.333, 3), 1)
})

test('an empty list sums to zero', () => {
  assert.equal(sumAmounts([]), 0)
  assert.equal(sumAmounts(undefined as never), 0)
})

test('values that are not numbers count as zero instead of poisoning the total', () => {
  assert.equal(sumAmounts([10, '', null, undefined, 'abc']), 10)
  assert.equal(lineAmount('', 10), 0)
  assert.equal(lineAmount(2, 'abc'), 0)
  assert.equal(grandTotal(undefined, 5), 5)
})

test('numeric strings from a form field are accepted', () => {
  assert.equal(lineAmount('3', '25.50'), 76.5)
  assert.equal(sumAmounts(['70', '30']), 100)
})
