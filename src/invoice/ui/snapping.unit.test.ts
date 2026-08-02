import assert from 'node:assert/strict'
import test from 'node:test'
import { snapCandidates, snapRect, snappedRect } from './snapping'
import type { IRect } from './geometry'

const BAND = { widthMm: 180, heightMm: 40 }

function rect(xMm: number, yMm: number, widthMm = 20, heightMm = 10): IRect {
  return { xMm, yMm, widthMm, heightMm }
}

function moving(xMm: number, yMm: number): IRect {
  return rect(xMm, yMm, 20, 4)
}

test('the candidates cover the edges and centres of the siblings and of the band', () => {
  const candidates = snapCandidates([rect(20, 10)], BAND)

  assert.deepEqual(candidates.x.slice(0, 3), [0, 90, 180])
  assert.ok(candidates.x.includes(20))
  assert.ok(candidates.x.includes(30))
  assert.ok(candidates.x.includes(40))
  assert.ok(candidates.y.includes(15))
})

test('an edge within the threshold snaps to its neighbour', () => {
  const result = snapRect(moving(21, 25), snapCandidates([rect(20, 0)], BAND), 2)

  assert.equal(result.rect.xMm, 20)
  assert.deepEqual(result.guides, [{ axis: 'x', positionMm: 20 }])
})

test('each axis snaps on its own', () => {
  const result = snapRect(moving(21, 25), snapCandidates([rect(20, 0)], BAND), 2)

  assert.equal(result.rect.xMm, 20)
  assert.equal(result.rect.yMm, 25)
  assert.equal(result.guides.length, 1)
})

test('outside the threshold nothing snaps', () => {
  const result = snapRect(moving(25, 25), snapCandidates([rect(20, 0)], BAND), 2)

  assert.equal(result.rect.xMm, 25)
  assert.deepEqual(result.guides, [])
})

test('the nearest candidate wins', () => {
  const result = snapRect(moving(19, 25), snapCandidates([rect(20, 0), rect(17, 0)], BAND), 3)

  assert.equal(result.rect.xMm, 20)
})

test('snapping never takes a block out of its band', () => {
  const result = snappedRect(moving(165, 25), [rect(178, 0)], BAND, 4)

  assert.equal(result.rect.xMm + result.rect.widthMm, BAND.widthMm)
  assert.deepEqual(result.guides, [])
})

test('a threshold that is not a distance is rejected', () => {
  assert.throws(() => snapRect(rect(0, 0), { x: [], y: [] }, -1), /threshold/)
})
