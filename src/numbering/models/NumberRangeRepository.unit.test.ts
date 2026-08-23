import assert from 'node:assert/strict'
import test from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { NumberRangeRepository, type ICreateNumberRangeInput } from './NumberRangeRepository'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

const VALID_FROM = Date.UTC(2026, 0, 1)
const VALID_TO = Date.UTC(2026, 11, 31)

function ranges(): NumberRangeRepository {
  return container.resolve(NumberRangeRepository)
}

function input(overrides: Partial<ICreateNumberRangeInput> = {}): ICreateNumberRangeInput {
  return {
    series: 'factura',
    prefix: 'FE',
    from: 1000,
    to: 1999,
    validFrom: VALID_FROM,
    validTo: VALID_TO,
    ...overrides,
  }
}

test('a new range points at its first number', async () => {
  const created = await ranges().createRange(input({ prefix: 'A' }))

  assert.equal(created.next, 1000)
  assert.equal(created.from, 1000)
  assert.equal(created.to, 1999)
})

test('a range whose end is before its start is refused', async () => {
  await assert.rejects(() => ranges().createRange(input({ prefix: 'B', from: 500, to: 100 })))

  const stored = await ranges().findAll()
  assert.equal(
    stored.some((range) => range.prefix === 'B'),
    false,
  )
})

test('a validity that ends before it starts is refused', async () => {
  await assert.rejects(() =>
    ranges().createRange(input({ prefix: 'C', validFrom: VALID_TO, validTo: VALID_FROM })),
  )
})

test('a range without a series is refused', async () => {
  await assert.rejects(() => ranges().createRange(input({ prefix: 'D', series: '' })))
})

test('an overlapping range is refused and the existing one does not change', async () => {
  const existing = await ranges().createRange(input({ prefix: 'E' }))

  await assert.rejects(
    () => ranges().createRange(input({ prefix: 'E', from: 1500, to: 2500 })),
    /overlaps/,
  )

  const stored = await ranges().findOrThrow(existing.id)
  assert.equal(stored.from, 1000)
  assert.equal(stored.to, 1999)
  assert.equal((await ranges().findBySeries('factura')).filter((r) => r.prefix === 'E').length, 1)
})

test('two disjoint spans with the same prefix live together', async () => {
  await ranges().createRange(input({ prefix: 'F', from: 1000, to: 1999 }))
  await ranges().createRange(input({ prefix: 'F', from: 2000, to: 2999 }))

  const stored = (await ranges().findBySeries('factura')).filter((r) => r.prefix === 'F')
  assert.equal(stored.length, 2)
})

test('the same span for another document type is accepted', async () => {
  await ranges().createRange(input({ prefix: 'G', from: 1, to: 999 }))
  const note = await ranges().createRange(
    input({ prefix: 'G', from: 1, to: 999, series: 'notaCredito' }),
  )

  assert.equal(note.series, 'notaCredito')
})

test('only valid and unexhausted ranges are usable, ordered by their start', async () => {
  await ranges().createRange(input({ prefix: 'H', from: 3000, to: 3999 }))
  await ranges().createRange(input({ prefix: 'H', from: 2000, to: 2999 }))
  await ranges().createRange(
    input({
      prefix: 'H',
      from: 4000,
      to: 4999,
      validFrom: Date.UTC(2020, 0, 1),
      validTo: Date.UTC(2020, 11, 31),
    }),
  )

  const usable = await ranges().findUsable('factura', Date.UTC(2026, 5, 15))
  const spans = usable.filter((range) => range.prefix === 'H').map((range) => range.from)

  assert.deepEqual(spans, [2000, 3000])
})

test('a covering range is found by type, prefix and number', async () => {
  await ranges().createRange(input({ prefix: 'I', from: 5000, to: 5999 }))

  assert.equal((await ranges().findCovering('factura', 'I', 5500)).length, 1)
  assert.equal((await ranges().findCovering('factura', 'I', 6500)).length, 0)
  assert.equal((await ranges().findCovering('factura', 'J', 5500)).length, 0)
})
