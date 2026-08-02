import assert from 'node:assert/strict'
import test from 'node:test'
import { applyDefaults } from './blocks/registry'
import { emptyDocument, type ICell } from './document'
import { validateDocument } from './validateDocument'

test('a well formed cell list is accepted', () => {
  const doc = emptyDocument()
  doc.dataSchema = [{ path: 'item.total', type: 'number', required: false }]
  doc.bands.detail.blocks = [
    applyDefaults('table', {
      props: {
        cells: [
          { label: 'Concepto', path: '', widthMm: 100, align: 'left' },
          { label: 'Total', path: 'item.total', format: 'currency', widthMm: 30, align: 'right' },
        ],
      },
    }),
  ]

  assert.deepEqual(validateDocument(doc), [])
})

test('a cell with an unusable width is reported by its position', () => {
  const doc = emptyDocument()
  doc.bands.detail.blocks = [
    applyDefaults('table', {
      props: { cells: [{ label: 'Concepto', path: '', widthMm: 0, align: 'left' }] },
    }),
  ]

  const issues = validateDocument(doc)

  assert.equal(issues.length, 1)
  assert.match(issues[0].path, /props\.cells\[0\]\.widthMm/)
})

test('a cell with an unknown alignment or a non textual label is reported', () => {
  const doc = emptyDocument()
  doc.bands.detail.blocks = [
    applyDefaults('table', {
      props: {
        cells: [{ label: 7, path: '', widthMm: 20, align: 'justify' } as unknown as ICell],
      },
    }),
  ]

  const issues = validateDocument(doc)

  assert.equal(issues.length, 2)
  assert.match(issues[0].path, /cells\[0\]\.label/)
  assert.match(issues[1].message, /left, center, right/)
})

test('a kind is rejected in a band its definition does not admit', () => {
  const doc = emptyDocument()
  doc.bands.pageFooter.blocks = [applyDefaults('table', { heightMm: 6 })]

  const issues = validateDocument(doc)

  assert.equal(issues.length, 1)
  assert.match(issues[0].message, /"table" is not allowed in band "pageFooter"/)
})

test('the same kind in its own band validates', () => {
  const doc = emptyDocument()
  doc.bands.detail.blocks = [applyDefaults('table', { heightMm: 6 })]

  assert.deepEqual(validateDocument(doc), [])
})
