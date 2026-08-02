import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampRect,
  MIN_SIZE_MM,
  movedRect,
  pxToMm,
  resizedRect,
  snapMm,
  type IRect,
} from './geometry'

const BAND = { widthMm: 180, heightMm: 40 }
const BLOCK: IRect = { xMm: 20, yMm: 10, widthMm: 60, heightMm: 8 }

test('a drag of ten millimetres right and five down lands where it should', () => {
  const pxPerMm = 4

  const moved = movedRect(BLOCK, 10 * pxPerMm, 5 * pxPerMm, pxPerMm, BAND)

  assert.deepEqual(moved, { xMm: 30, yMm: 15, widthMm: 60, heightMm: 8 })
})

test('the same physical distance gives the same millimetres at any scale', () => {
  const atOne = movedRect(BLOCK, 40, 20, 4, BAND)
  const atThree = movedRect(BLOCK, 120, 60, 12, BAND)

  assert.deepEqual(atOne, atThree)
})

test('moving never changes the size, not even for a hairline block', () => {
  const rule: IRect = { xMm: 0, yMm: 2, widthMm: 180, heightMm: 0.2 }

  const moved = movedRect(rule, 0, 4, 4, BAND)

  assert.equal(moved.heightMm, 0.2)
  assert.equal(moved.widthMm, 180)
})

test('a drag past the edge of the band stops at the edge', () => {
  const far = movedRect(BLOCK, 10_000, 10_000, 4, BAND)
  const negative = movedRect(BLOCK, -10_000, -10_000, 4, BAND)

  assert.deepEqual(far, { xMm: 120, yMm: 32, widthMm: 60, heightMm: 8 })
  assert.deepEqual(negative, { xMm: 0, yMm: 0, widthMm: 60, heightMm: 8 })
})

test('resizing backwards past the origin stops at the minimum', () => {
  const resized = resizedRect(BLOCK, -10_000, -10_000, 4, BAND)

  assert.equal(resized.widthMm, MIN_SIZE_MM)
  assert.equal(resized.heightMm, MIN_SIZE_MM)
  assert.equal(resized.xMm, 20)
  assert.equal(resized.yMm, 10)
})

test('resizing never spills out of the band', () => {
  const resized = resizedRect(BLOCK, 10_000, 10_000, 4, BAND)

  assert.ok(resized.xMm + resized.widthMm <= BAND.widthMm)
  assert.ok(resized.yMm + resized.heightMm <= BAND.heightMm)
})

test('a block wider than its band is pulled back inside instead of going negative', () => {
  const bounded = clampRect({ xMm: 5, yMm: 5, widthMm: 500, heightMm: 500 }, BAND)

  assert.deepEqual(bounded, { xMm: 0, yMm: 0, widthMm: 180, heightMm: 40 })
})

test('millimetres snap to whole units', () => {
  assert.equal(snapMm(12.4), 12)
  assert.equal(snapMm(12.5), 13)
  assert.equal(snapMm(-0.4), -0)
})

test('an unusable scale is rejected instead of producing infinities', () => {
  assert.throws(() => pxToMm(10, 0), /positive scale/)
  assert.throws(() => pxToMm(10, -4), /positive scale/)
  assert.throws(() => pxToMm(10, Number.NaN), /positive scale/)
  assert.throws(() => pxToMm(Number.POSITIVE_INFINITY, 4), /finite/)
})

test('the conversion is the plain ratio', () => {
  assert.equal(pxToMm(40, 4), 10)
  assert.equal(pxToMm(-40, 4), -10)
})

const BAND_BOX = { widthMm: 180, heightMm: 40 }

test('a corner handle moves its own edges and leaves the opposite corner fixed', () => {
  const start = { xMm: 20, yMm: 10, widthMm: 60, heightMm: 20 }

  const next = resizedRect(start, 10, 5, 1, BAND_BOX, 'nw')

  assert.deepEqual(next, { xMm: 30, yMm: 15, widthMm: 50, heightMm: 15 })
  assert.equal(next.xMm + next.widthMm, start.xMm + start.widthMm)
  assert.equal(next.yMm + next.heightMm, start.yMm + start.heightMm)
})

test('a side handle changes a single axis', () => {
  const start = { xMm: 20, yMm: 10, widthMm: 60, heightMm: 20 }

  const next = resizedRect(start, 10, 8, 1, BAND_BOX, 'e')

  assert.deepEqual(next, { xMm: 20, yMm: 10, widthMm: 70, heightMm: 20 })
})

test('a handle dragged past its opposite edge stops at the minimum size', () => {
  const start = { xMm: 20, yMm: 10, widthMm: 60, heightMm: 20 }

  const next = resizedRect(start, 100, 0, 1, BAND_BOX, 'w')

  assert.equal(next.widthMm, MIN_SIZE_MM)
  assert.equal(next.xMm + next.widthMm, start.xMm + start.widthMm)
})
