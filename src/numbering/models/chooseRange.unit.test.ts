import assert from 'node:assert/strict'
import test from 'node:test'
import { chooseRange } from './chooseRange'
import { NumberRange, type INumberRangeData } from './NumberRange'

const AT = Date.UTC(2026, 5, 15)

function range(overrides: Partial<INumberRangeData> = {}): NumberRange {
  return new NumberRange({
    series: 'factura',
    prefix: 'FE',
    from: 1000,
    to: 1999,
    next: 1200,
    validFrom: Date.UTC(2026, 0, 1),
    validTo: Date.UTC(2026, 11, 31),
    ...overrides,
  })
}

test('without a number it takes the pointer of the first usable range', () => {
  const choice = chooseRange({
    ranges: [range({ from: 2000, to: 2999, next: 2000 }), range()],
    at: AT,
  })

  assert.equal(choice.status, 'chosen')
  assert.equal(choice.status === 'chosen' && choice.number, 1200)
})

test('with no range at all there is nothing to issue against', () => {
  const choice = chooseRange({ ranges: [], at: AT })

  assert.equal(choice.status === 'rejected' && choice.reason, 'NO_NUMBER_RANGE')
})

test('a valid but spent range is reported as exhausted', () => {
  const choice = chooseRange({ ranges: [range({ next: 2000 })], at: AT })

  assert.equal(choice.status === 'rejected' && choice.reason, 'RANGE_EXHAUSTED')
})

test('a range outside its window is reported as expired', () => {
  const choice = chooseRange({ ranges: [range()], at: Date.UTC(2027, 0, 1) })

  assert.equal(choice.status === 'rejected' && choice.reason, 'RANGE_EXPIRED')
})

test('the prefix narrows which range answers, on the automatic path', () => {
  const ranges = [range({ prefix: 'A', next: 1000 }), range({ prefix: 'B', next: 1500 })]

  const chosen = chooseRange({ ranges, at: AT, prefix: 'B' })

  assert.equal(chosen.status === 'chosen' && chosen.number, 1500)
  assert.equal(chosen.status === 'chosen' && chosen.range.prefix, 'B')
})

test('two prefixes and no way to tell them apart is a refusal, not a coin toss', () => {
  const ranges = [range({ prefix: 'A' }), range({ prefix: 'B' })]

  assert.equal(
    chooseRange({ ranges, at: AT }).status === 'rejected' &&
      (chooseRange({ ranges, at: AT }) as { reason: string }).reason,
    'AMBIGUOUS_PREFIX',
  )
})

test('a given number ahead of the pointer is accepted', () => {
  const choice = chooseRange({ ranges: [range()], at: AT, number: 1500 })

  assert.equal(choice.status === 'chosen' && choice.number, 1500)
})

test('a given number behind the pointer is accepted too, so gaps can be filled', () => {
  const choice = chooseRange({ ranges: [range()], at: AT, number: 1050 })

  assert.equal(choice.status === 'chosen' && choice.number, 1050)
})

test('a given number is accepted even when the range is spent, because it takes no pointer', () => {
  const choice = chooseRange({ ranges: [range({ next: 2000 })], at: AT, number: 1050 })

  assert.equal(choice.status === 'chosen' && choice.number, 1050)
})

test('a given number outside every range is refused', () => {
  const choice = chooseRange({ ranges: [range()], at: AT, number: 5000 })

  assert.equal(choice.status === 'rejected' && choice.reason, 'NUMBER_OUT_OF_RANGE')
})

test('a given number in a range that is out of its window is refused', () => {
  const choice = chooseRange({ ranges: [range()], at: Date.UTC(2027, 0, 1), number: 1500 })

  assert.equal(choice.status === 'rejected' && choice.reason, 'NUMBER_OUT_OF_RANGE')
})

test('a given number that is not a whole consecutive is refused', () => {
  const choice = chooseRange({ ranges: [range()], at: AT, number: 1500.5 })

  assert.equal(choice.status === 'rejected' && choice.reason, 'NUMBER_OUT_OF_RANGE')
})

test('an instant is required to decide anything', () => {
  assert.throws(() => chooseRange({ ranges: [range()], at: Number.NaN }))
})
