import assert from 'node:assert/strict'
import test from 'node:test'
import { findBlockDefinition } from '../render/blocks/registry'
import { emptyDocument, type IDocument, type ITextContent } from '../render/document'
import { render } from '../render/render'
import { sampleDataFor } from '../render/sampleData'
import { invoiceDocumentFixture } from '../render/__fixtures__/invoiceDocument'
import { renderToHtml } from '../render/__fixtures__/renderToHtml'
import { Inspector } from './Inspector'
import { movedCell } from './CellsEditor'
import { applyPropChange, addBlock, findBlock, setBandHeight, setThemeToken } from './documentEdits'
import { h } from '@wabot-dev/framework/ui'
import { createEditorStore, type IEditorStore } from './editorStore'

function storeWith(doc: IDocument = invoiceDocumentFixture()): IEditorStore {
  return createEditorStore({ templateId: 't1', doc, rev: 1 })
}

async function inspectorHtml(store: IEditorStore, assets = [{ id: 'a1', label: 'logo.png' }]) {
  return renderToHtml(h(Inspector, { store, assets }))
}

test('a block without its own Inspector gets one editor per schema property', async () => {
  const store = storeWith()
  store.select('header', ['issuer'])

  const html = await inspectorHtml(store)

  const schema = findBlockDefinition('text')?.schema
  assert.ok(schema)
  for (const propName of Object.keys(schema)) {
    assert.ok(html.includes(propName), `${propName} has no editor`)
  }
  assert.equal(findBlockDefinition('text')?.Inspector, undefined)
})

test('an enumerated property offers only its declared values', async () => {
  const store = storeWith()
  store.select('header', ['issuer'])

  const html = await inspectorHtml(store)

  for (const value of ['left', 'center', 'right']) {
    assert.ok(html.includes(`value="${value}"`), `${value} is missing`)
  }
  assert.doesNotMatch(html, /value="justify"/)
})

test('a token property offers the theme tokens as references', async () => {
  const store = storeWith()
  store.select('header', ['issuer'])

  const html = await inspectorHtml(store)

  assert.ok(html.includes('value="@primary"'))
  assert.ok(html.includes('value="@text"'))
  assert.doesNotMatch(html, /value="#0a58ca"/)
})

test('choosing a token writes the reference and never the literal colour', () => {
  const doc = invoiceDocumentFixture()

  const next = applyPropChange(doc, 'header', 'issuer', 'color', '@primary')

  const block = findBlock(next, 'header', 'issuer')
  assert.equal(block?.props.color, '@primary')
  assert.equal(String(block?.props.color).startsWith('#'), false)
  assert.equal(next.theme.primary, doc.theme.primary)
})

test('changing one property leaves every other property and block alone', () => {
  const doc = invoiceDocumentFixture()

  const next = applyPropChange(doc, 'header', 'issuer', 'align', 'center')

  const before = findBlock(doc, 'header', 'issuer')
  const after = findBlock(next, 'header', 'issuer')
  assert.equal(after?.props.align, 'center')
  assert.equal(after?.props.color, before?.props.color)
  assert.equal(after?.props.fontSize, before?.props.fontSize)
  assert.deepEqual(next.bands.summary, doc.bands.summary)
})

test('the asset editor points at the theme, and the block keeps its token', async () => {
  const store = storeWith()
  store.select('header', ['logo'])

  const html = await inspectorHtml(store, [{ id: 'asset-1', label: 'marca.png' }])

  assert.ok(html.includes('value="asset-1"'))
  const next = setThemeToken(store.doc.value, 'logo', 'asset-1')
  assert.equal(next.theme.logo, 'asset-1')
  assert.equal(findBlock(next, 'header', 'logo')?.props.asset, '@logo')
})

test('the inspector says so when nothing is selected', async () => {
  const html = await inspectorHtml(storeWith())

  assert.match(html, /Selecciona un bloque/)
})

test('a literal and a binding live together in one text content', async () => {
  const doc = emptyDocument()
  const { doc: withBlock, blockId } = addBlock(doc, 'header', 'text')
  const content: ITextContent = {
    fragments: [
      { type: 'literal', text: 'Factura ' },
      { type: 'binding', path: 'factura.numero' },
    ],
  }

  const next = applyPropChange(withBlock, 'header', blockId, 'content', content)

  const stored = findBlock(next, 'header', blockId)?.props.content as ITextContent
  assert.equal(stored.fragments.length, 2)
  assert.equal(stored.fragments[0].type, 'literal')
  assert.equal(stored.fragments[1].type, 'binding')

  const sample = sampleDataFor(next)
  const html = await renderToHtml(render({ doc: next, data: sample.data, items: [sample.item] }))
  assert.ok(html.includes('Factura '))
  assert.ok(html.includes('Texto'))
})

test('binding to an unknown path declares it as optional', () => {
  const doc = emptyDocument()
  const { doc: withBlock, blockId } = addBlock(doc, 'header', 'text')

  const next = applyPropChange(withBlock, 'header', blockId, 'content', {
    fragments: [{ type: 'binding', path: 'cliente.nif' }],
  })

  assert.deepEqual(
    next.dataSchema.find((entry) => entry.path === 'cliente.nif'),
    { path: 'cliente.nif', type: 'string', required: false },
  )
})

test('binding to a known required path leaves its declaration untouched', () => {
  const doc = invoiceDocumentFixture()
  const before = doc.dataSchema.find((entry) => entry.path === 'factura.total')
  assert.equal(before?.required, true)
  assert.equal(before?.type, 'number')

  const next = applyPropChange(doc, 'header', 'issuer', 'content', {
    fragments: [{ type: 'binding', path: 'factura.total', format: 'currency' }],
  })

  assert.deepEqual(
    next.dataSchema.find((entry) => entry.path === 'factura.total'),
    before,
  )
})

test('an empty binding path declares nothing', () => {
  const doc = emptyDocument()
  const { doc: withBlock, blockId } = addBlock(doc, 'header', 'text')

  const next = applyPropChange(withBlock, 'header', blockId, 'content', {
    fragments: [{ type: 'binding', path: '' }],
  })

  assert.deepEqual(next.dataSchema, [])
})

test('markup typed into a literal is painted as text, not as elements', async () => {
  const doc = emptyDocument()
  const { doc: withBlock, blockId } = addBlock(doc, 'header', 'text')

  const next = applyPropChange(withBlock, 'header', blockId, 'content', {
    fragments: [{ type: 'literal', text: '<script>alert(1)</script>' }],
  })

  const html = await renderToHtml(render({ doc: next }))

  assert.doesNotMatch(html, /<script/)
  assert.doesNotMatch(html, /<\/script/)
  assert.ok(html.includes('&lt;script'))
  assert.ok(html.includes('alert(1)'))
})

test('a cells property gets its editor without the definition writing one', async () => {
  const store = storeWith()
  store.select('detail', ['items'])

  const html = await inspectorHtml(store)

  assert.match(html, /data-cell-label="0"/)
  assert.match(html, /data-cell-path="0"/)
  assert.match(html, /data-cell-width="0"/)
  assert.match(html, /data-add-cell="true"/)
  assert.equal(findBlockDefinition('table')?.Inspector, undefined)
})

test('the cells editor shows the widths it uses against the width of the block', async () => {
  const store = storeWith()
  store.select('detail', ['items'])

  const html = await inspectorHtml(store)

  assert.match(html, /data-cells-width="180"/)
})

test('reordering cells moves one and leaves the others in order', () => {
  const cells = [
    { label: 'a', path: '', widthMm: 10, align: 'left' as const },
    { label: 'b', path: '', widthMm: 10, align: 'left' as const },
    { label: 'c', path: '', widthMm: 10, align: 'left' as const },
  ]

  assert.deepEqual(
    movedCell(cells, 2, 0).map((cell) => cell.label),
    ['c', 'a', 'b'],
  )
  assert.equal(movedCell(cells, 0, -1), cells)
  assert.equal(movedCell(cells, 2, 3), cells)
})

test('binding a cell to a new path declares it in the schema as optional', () => {
  const doc = invoiceDocumentFixture()
  const cells = [{ label: 'IVA', path: 'item.iva', widthMm: 20, align: 'right' as const }]

  const next = applyPropChange(doc, 'detail', 'items', 'cells', cells)
  const declared = next.dataSchema.find((entry) => entry.path === 'item.iva')

  assert.ok(declared)
  assert.equal(declared.required, false)
  assert.equal(
    doc.dataSchema.some((entry) => entry.path === 'item.iva'),
    false,
  )
})
