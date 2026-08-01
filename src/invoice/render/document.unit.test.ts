import assert from 'node:assert/strict'
import test from 'node:test'
import { applyDefaults } from './blocks/registry'
import { emptyDocument } from './document'
import { invoiceDocumentFixture } from './__fixtures__/invoiceDocument'
import { validateDocument } from './validateDocument'

test('an empty document is valid', () => {
  assert.deepEqual(validateDocument(emptyDocument()), [])
})

test('the invoice fixture is valid', () => {
  assert.deepEqual(validateDocument(invoiceDocumentFixture()), [])
})

test('a document survives a round trip through JSON', () => {
  const doc = invoiceDocumentFixture()

  assert.deepEqual(JSON.parse(JSON.stringify(doc)), doc)
})

test('a missing band is reported by name', () => {
  const doc = emptyDocument() as any
  delete doc.bands.summary

  const issues = validateDocument(doc)

  assert.equal(issues.length, 1)
  assert.equal(issues[0].path, 'bands.summary')
})

test('an unknown band is reported', () => {
  const doc = emptyDocument() as any
  doc.bands.watermark = { heightMm: 10, blocks: [] }

  const issues = validateDocument(doc)

  assert.equal(issues.length, 1)
  assert.match(issues[0].path, /watermark/)
})

test('a page with a non positive measure is rejected', () => {
  const doc = emptyDocument()
  doc.page.widthMm = 0

  const issues = validateDocument(doc)

  assert.ok(issues.some((issue) => issue.path === 'page.widthMm'))
})

test('a block that overflows its band height is reported', () => {
  const doc = emptyDocument()
  doc.bands.detail.heightMm = 8
  doc.bands.detail.blocks = [applyDefaults('box', { yMm: 4, heightMm: 10, widthMm: 20 })]

  const issues = validateDocument(doc)

  assert.equal(issues.length, 1)
  assert.match(issues[0].message, /band height of 8mm/)
})

test('a block that overflows the usable page width is reported', () => {
  const doc = emptyDocument()
  doc.bands.header.blocks = [applyDefaults('box', { xMm: 170, widthMm: 20, heightMm: 10 })]

  const issues = validateDocument(doc)

  assert.equal(issues.length, 1)
  assert.match(issues[0].message, /usable page width of 180mm/)
})

test('the same coordinates are valid in different bands', () => {
  const doc = emptyDocument()
  doc.bands.header.heightMm = 40
  doc.bands.detail.heightMm = 40
  const block = { yMm: 30, heightMm: 8, widthMm: 20 }
  doc.bands.header.blocks = [applyDefaults('box', { ...block, id: 'a' })]
  doc.bands.detail.blocks = [applyDefaults('box', { ...block, id: 'b' })]

  assert.deepEqual(validateDocument(doc), [])
})

test('an unknown block kind is reported', () => {
  const doc = emptyDocument() as any
  doc.bands.header.blocks = [
    { id: 'x', kind: 'qr', xMm: 0, yMm: 0, widthMm: 10, heightMm: 10, props: {} },
  ]

  const issues = validateDocument(doc)

  assert.ok(issues.some((issue) => issue.message.includes('unknown block kind "qr"')))
})

test('a prop outside the schema of its kind is reported', () => {
  const doc = emptyDocument()
  const block = applyDefaults('line', { widthMm: 20, heightMm: 1 })
  block.props.dashed = true
  doc.bands.header.blocks = [block]

  const issues = validateDocument(doc)

  assert.equal(issues.length, 1)
  assert.match(issues[0].path, /props\.dashed$/)
})

test('a literal colour instead of a token reference is rejected', () => {
  const doc = emptyDocument()
  const block = applyDefaults('line', { widthMm: 20, heightMm: 1 })
  block.props.color = '#ff0000'
  doc.bands.header.blocks = [block]

  const issues = validateDocument(doc)

  assert.equal(issues.length, 1)
  assert.match(issues[0].message, /token reference/)
})

test('a reference to an undeclared token is reported', () => {
  const doc = emptyDocument()
  const block = applyDefaults('line', { widthMm: 20, heightMm: 1 })
  block.props.color = '@accent'
  doc.bands.header.blocks = [block]

  const issues = validateDocument(doc)

  assert.equal(issues.length, 1)
  assert.match(issues[0].message, /"accent" is not declared/)
})

test('changing a theme value leaves the blocks untouched', () => {
  const doc = invoiceDocumentFixture()
  const before = JSON.stringify(doc.bands)

  doc.theme.primary = '#ff6600'

  assert.equal(JSON.stringify(doc.bands), before)
  assert.deepEqual(validateDocument(doc), [])
})

test('text content is a structure, and raw HTML stays literal text', () => {
  const doc = emptyDocument()
  doc.bands.header.blocks = [
    applyDefaults('text', {
      widthMm: 40,
      heightMm: 6,
      props: { content: { fragments: [{ type: 'literal', text: '<b>Total</b>' }] } },
    }),
  ]

  assert.deepEqual(validateDocument(doc), [])
  const content = doc.bands.header.blocks[0].props.content as any
  assert.equal(content.fragments[0].text, '<b>Total</b>')
  assert.equal(typeof content.fragments[0], 'object')
})

test('a text content given as an HTML string is rejected', () => {
  const doc = emptyDocument()
  const block = applyDefaults('text', { widthMm: 40, heightMm: 6 })
  block.props.content = '<b>Total</b>'
  doc.bands.header.blocks = [block]

  const issues = validateDocument(doc)

  assert.equal(issues.length, 1)
  assert.match(issues[0].message, /fragments array/)
})

test('all independent errors are reported, not just the first', () => {
  const doc = emptyDocument() as any
  doc.version = 2
  doc.page.widthMm = -1
  delete doc.bands.detail

  const issues = validateDocument(doc)

  assert.equal(issues.length, 3)
  assert.deepEqual(issues.map((issue: any) => issue.path).sort(), [
    'bands.detail',
    'page.widthMm',
    'version',
  ])
})

test('validation is deterministic and does not mutate its input', () => {
  const doc = invoiceDocumentFixture()
  const snapshot = JSON.stringify(doc)

  const first = validateDocument(doc)
  const second = validateDocument(doc)

  assert.deepEqual(first, second)
  assert.equal(JSON.stringify(doc), snapshot)
})
