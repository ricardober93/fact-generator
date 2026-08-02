import assert from 'node:assert/strict'
import test from 'node:test'
import { emptyDocument } from '../render/document'
import { invoiceDocumentFixture } from '../render/__fixtures__/invoiceDocument'
import {
  addBlock,
  bandBoxOf,
  declareDataPath,
  findBlock,
  removeBlock,
  removeBlocks,
  setBandHeight,
  setBlockProp,
  setBlockRect,
  setBlockRects,
} from './documentEdits'

test('every edit returns a new document and leaves the previous one intact', () => {
  const doc = invoiceDocumentFixture()
  const snapshot = JSON.stringify(doc)

  const moved = setBlockRect(doc, 'header', 'issuer', {
    xMm: 10,
    yMm: 4,
    widthMm: 80,
    heightMm: 8,
  })
  const propped = setBlockProp(doc, 'header', 'issuer', 'align', 'center')
  const { doc: added } = addBlock(doc, 'summary', 'box')
  const removed = removeBlock(doc, 'summary', 'summaryRule')
  const resized = setBandHeight(doc, 'header', 50)

  assert.equal(JSON.stringify(doc), snapshot)
  for (const next of [moved, propped, added, removed, resized]) {
    assert.notEqual(next, doc)
    assert.notEqual(JSON.stringify(next), snapshot)
  }
})

test('a moved block keeps its own size and touches nothing else', () => {
  const doc = invoiceDocumentFixture()

  const next = setBlockRect(doc, 'header', 'issuer', {
    xMm: 60,
    yMm: 2,
    widthMm: 80,
    heightMm: 8,
  })

  const block = findBlock(next, 'header', 'issuer')
  assert.deepEqual(
    { x: block?.xMm, y: block?.yMm, w: block?.widthMm, h: block?.heightMm },
    { x: 60, y: 2, w: 80, h: 8 },
  )
  assert.deepEqual(findBlock(next, 'header', 'logo'), findBlock(doc, 'header', 'logo'))
  assert.deepEqual(next.bands.summary, doc.bands.summary)
})

test('an edit cannot push a block out of its band', () => {
  const doc = invoiceDocumentFixture()
  const box = bandBoxOf(doc, 'header')

  const next = setBlockRect(doc, 'header', 'issuer', {
    xMm: 900,
    yMm: 900,
    widthMm: 80,
    heightMm: 8,
  })

  const block = findBlock(next, 'header', 'issuer')
  assert.equal(block?.xMm, box.widthMm - 80)
  assert.equal(block?.yMm, box.heightMm - 8)
})

test('a new block lands in the chosen band with its defaults and its own id', () => {
  const doc = emptyDocument()

  const { doc: next, blockId } = addBlock(doc, 'detail', 'text')

  assert.equal(next.bands.detail.blocks.length, 1)
  assert.equal(next.bands.summary.blocks.length, 0)
  const block = findBlock(next, 'detail', blockId)
  assert.ok(block)
  assert.deepEqual(Object.keys(block.props).sort(), [
    'align',
    'color',
    'content',
    'fontFamily',
    'fontSize',
  ])
  assert.equal(block.props.color, '@text')
})

test('two added blocks do not share an id', () => {
  const first = addBlock(emptyDocument(), 'header', 'box')
  const second = addBlock(first.doc, 'header', 'box')

  assert.notEqual(first.blockId, second.blockId)
  assert.equal(second.doc.bands.header.blocks.length, 2)
})

test('changing a property leaves the other properties and blocks alone', () => {
  const doc = invoiceDocumentFixture()

  const next = setBlockProp(doc, 'header', 'issuer', 'align', 'right')

  const before = findBlock(doc, 'header', 'issuer')
  const after = findBlock(next, 'header', 'issuer')
  assert.equal(after?.props.align, 'right')
  assert.equal(after?.props.color, before?.props.color)
  assert.deepEqual(findBlock(next, 'header', 'number'), findBlock(doc, 'header', 'number'))
})

test('shrinking a band pulls its blocks back inside', () => {
  const doc = invoiceDocumentFixture()

  const next = setBandHeight(doc, 'header', 10)

  for (const block of next.bands.header.blocks) {
    assert.ok(block.yMm + block.heightMm <= 10, `${block.id} overflows the band`)
  }
})

test('an unknown band or block is rejected instead of silently ignored', () => {
  const doc = emptyDocument()

  assert.throws(() => findBlock(doc, 'nope' as 'header', 'x'), /unknown band/)
  assert.throws(() => setBlockProp(doc, 'header', 'ghost', 'align', 'left'), /is not in band/)
  assert.throws(() => addBlock(doc, 'header', ''), /kind is required/)
  assert.throws(() => setBandHeight(doc, 'header', 0), /positive number/)
})

test('declaring a data path adds it as optional and leaves a known one untouched', () => {
  const doc = invoiceDocumentFixture()
  const before = doc.dataSchema.find((entry) => entry.path === 'factura.total')
  assert.ok(before)

  const added = declareDataPath(doc, 'cliente.nif')
  const untouched = declareDataPath(doc, 'factura.total')

  const declared = added.dataSchema.find((entry) => entry.path === 'cliente.nif')
  assert.deepEqual(declared, { path: 'cliente.nif', type: 'string', required: false })
  assert.equal(untouched, doc)
  assert.deepEqual(
    untouched.dataSchema.find((entry) => entry.path === 'factura.total'),
    before,
  )
})

test('a gesture writes the geometry of every block it moved', () => {
  const doc = invoiceDocumentFixture()

  const next = setBlockRects(doc, 'header', {
    issuer: { xMm: 10, yMm: 2, widthMm: 80, heightMm: 8 },
    customer: { xMm: 10, yMm: 26, widthMm: 100, heightMm: 6 },
  })

  assert.equal(findBlock(next, 'header', 'issuer')?.xMm, 10)
  assert.equal(findBlock(next, 'header', 'customer')?.yMm, 26)
  assert.equal(findBlock(next, 'header', 'logo')?.xMm, findBlock(doc, 'header', 'logo')?.xMm)
  assert.equal(findBlock(doc, 'header', 'issuer')?.xMm, 50)
})

test('a rect written outside the band is brought back inside it', () => {
  const doc = invoiceDocumentFixture()

  const next = setBlockRects(doc, 'header', {
    issuer: { xMm: 500, yMm: 900, widthMm: 80, heightMm: 8 },
  })
  const block = findBlock(next, 'header', 'issuer')!

  assert.equal(block.xMm + block.widthMm, 180)
  assert.equal(block.yMm + block.heightMm, doc.bands.header.heightMm)
})

test('deleting a selection removes every block in it and nothing else', () => {
  const doc = invoiceDocumentFixture()

  const next = removeBlocks(doc, 'header', ['issuer', 'customer'])

  assert.deepEqual(
    next.bands.header.blocks.map((block) => block.id),
    ['logo', 'number'],
  )
  assert.equal(removeBlocks(doc, 'header', []), doc)
})
