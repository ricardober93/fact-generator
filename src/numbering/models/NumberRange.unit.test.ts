import assert from 'node:assert/strict'
import test from 'node:test'
import { NumberRange, type INumberRangeData } from './NumberRange'

const VALID_FROM = Date.UTC(2026, 0, 1)
const VALID_TO = Date.UTC(2026, 11, 31)

function range(overrides: Partial<INumberRangeData> = {}): NumberRange {
  return new NumberRange({
    series: 'factura',
    prefix: 'FE',
    from: 1000,
    to: 1999,
    next: 1000,
    validFrom: VALID_FROM,
    validTo: VALID_TO,
    ...overrides,
  })
}

test('a range is valid inside its validity window and outside it is not', () => {
  const subject = range()

  assert.equal(subject.isValidAt(Date.UTC(2026, 5, 15)), true)
  assert.equal(subject.isValidAt(VALID_FROM), true)
  assert.equal(subject.isValidAt(VALID_TO), true)
  assert.equal(subject.isValidAt(Date.UTC(2025, 11, 31)), false)
  assert.equal(subject.isValidAt(Date.UTC(2027, 0, 1)), false)
})

test('a range is exhausted only once its pointer passes its last consecutive', () => {
  assert.equal(range({ next: 1999 }).exhausted, false)
  assert.equal(range({ next: 2000 }).exhausted, true)
})

test('a range covers the numbers between its ends, included', () => {
  const subject = range()

  assert.equal(subject.covers(1000), true)
  assert.equal(subject.covers(1999), true)
  assert.equal(subject.covers(999), false)
  assert.equal(subject.covers(2000), false)
  assert.equal(subject.covers(1500.5), false)
})

test('a range is usable when it is valid and not exhausted', () => {
  const at = Date.UTC(2026, 5, 15)

  assert.equal(range().usableAt(at), true)
  assert.equal(range({ next: 2000 }).usableAt(at), false)
  assert.equal(range().usableAt(Date.UTC(2027, 0, 1)), false)
})

test('two spans overlap when they share any consecutive', () => {
  const subject = range()

  assert.equal(subject.overlaps(1500, 2500), true)
  assert.equal(subject.overlaps(500, 1000), true)
  assert.equal(subject.overlaps(1999, 3000), true)
  assert.equal(subject.overlaps(2000, 2999), false)
  assert.equal(subject.overlaps(1, 999), false)
})
