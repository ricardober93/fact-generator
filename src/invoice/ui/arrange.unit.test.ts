import assert from 'node:assert/strict'
import test from 'node:test'
import { applyDefaults } from '../render/blocks/registry'
import { emptyDocument, type IDocument } from '../render/document'
import {
  addBlockAt,
  alignBlocks,
  blocksWithin,
  copiedBlocks,
  distributeBlocks,
  duplicateBlocks,
  moveBlocks,
  pasteBlocks,
  reorderBlock,
} from './arrange'

function docWith(...rects: { id: string; xMm: number; yMm: number }[]): IDocument {
  const doc = emptyDocument()
  doc.bands.header.blocks = rects.map((rect) =>
    applyDefaults('box', { ...rect, widthMm: 20, heightMm: 6 }),
  )
  return doc
}

const THREE = [
  { id: 'a', xMm: 0, yMm: 0 },
  { id: 'b', xMm: 40, yMm: 10 },
  { id: 'c', xMm: 100, yMm: 20 },
]

test('moving a set keeps the distances between its blocks', () => {
  const doc = moveBlocks(docWith(...THREE), 'header', ['a', 'b'], 10, 5)
  const [a, b] = doc.bands.header.blocks

  assert.deepEqual([a.xMm, a.yMm], [10, 5])
  assert.deepEqual([b.xMm, b.yMm], [50, 15])
  assert.equal(doc.bands.header.blocks[2].xMm, 100)
})

test('a set stops at the band edge as a whole', () => {
  const doc = moveBlocks(docWith(...THREE), 'header', ['a', 'c'], 100, 0)
  const [a, , c] = doc.bands.header.blocks

  assert.equal(c.xMm + c.widthMm, 180)
  assert.equal(c.xMm - a.xMm, 100)
})

test('aligning equals a coordinate without touching sizes', () => {
  const doc = alignBlocks(docWith(...THREE), 'header', ['a', 'b', 'c'], 'left')

  for (const block of doc.bands.header.blocks) {
    assert.equal(block.xMm, 0)
    assert.equal(block.widthMm, 20)
  }
})

test('aligning to the right uses the bounds of the selection', () => {
  const doc = alignBlocks(docWith(...THREE), 'header', ['a', 'b', 'c'], 'right')

  for (const block of doc.bands.header.blocks) {
    assert.equal(block.xMm + block.widthMm, 120)
  }
})

test('distributing leaves equal gaps without moving the extremes', () => {
  const doc = distributeBlocks(docWith(...THREE), 'header', ['a', 'b', 'c'], 'x')
  const [a, b, c] = doc.bands.header.blocks

  assert.equal(a.xMm, 0)
  assert.equal(c.xMm + c.widthMm, 120)
  assert.equal(b.xMm - (a.xMm + a.widthMm), c.xMm - (b.xMm + b.widthMm))
})

test('a selection too small to arrange leaves the document alone', () => {
  const doc = docWith(...THREE)

  assert.equal(alignBlocks(doc, 'header', ['a'], 'left'), doc)
  assert.equal(distributeBlocks(doc, 'header', ['a', 'b'], 'x'), doc)
  assert.equal(moveBlocks(doc, 'header', [], 5, 5), doc)
})

test('duplicating creates offset copies with new ids', () => {
  const result = duplicateBlocks(docWith(...THREE), 'header', ['a', 'b'])
  const blocks = result.doc.bands.header.blocks

  assert.equal(blocks.length, 5)
  assert.equal(result.blockIds.length, 2)
  assert.equal(result.blockIds.includes('a'), false)
  assert.deepEqual([blocks[3].xMm, blocks[3].yMm], [2, 2])
  assert.equal(blocks[0].xMm, 0)
})

test('pasting does not alter what was copied', () => {
  const doc = docWith(...THREE)
  const clipboard = copiedBlocks(doc, 'header', ['a'])

  const first = pasteBlocks(doc, 'header', clipboard)
  const second = pasteBlocks(first.doc, 'header', clipboard)

  assert.notEqual(first.blockIds[0], second.blockIds[0])
  assert.equal(second.doc.bands.header.blocks.length, 5)
  assert.equal(doc.bands.header.blocks.length, 3)
})

test('reordering changes which block is painted last', () => {
  const doc = reorderBlock(docWith(...THREE), 'header', 'a', 2)

  assert.deepEqual(
    doc.bands.header.blocks.map((block) => block.id),
    ['b', 'c', 'a'],
  )
  assert.throws(() => reorderBlock(doc, 'header', 'zz', 0), /is not in band/)
})

test('a marquee selects only the blocks it contains', () => {
  const ids = blocksWithin(docWith(...THREE), 'header', {
    xMm: 0,
    yMm: 0,
    widthMm: 70,
    heightMm: 20,
  })

  assert.deepEqual(ids, ['a', 'b'])
})

test('a block dropped on a band lands where it was dropped', () => {
  const result = addBlockAt(emptyDocument(), 'summary', 'text', 30, 12)
  const [block] = result.doc.bands.summary.blocks

  assert.deepEqual([block.xMm, block.yMm], [30, 12])
  assert.equal(block.props.color, '@text')
  assert.equal(result.blockIds[0], block.id)
})

test('a kind not admitted by the band is refused on drop', () => {
  assert.throws(() => addBlockAt(emptyDocument(), 'pageFooter', 'table', 0, 0), /not allowed/)
  assert.throws(() => addBlockAt(emptyDocument(), 'detail', 'qr', 0, 0), /Unknown block kind/)
})
