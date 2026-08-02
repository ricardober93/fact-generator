import assert from 'node:assert/strict'
import test from 'node:test'
import { h } from '@wabot-dev/framework/ui'
import type { IDocument } from '../render/document'
import { invoiceDocumentFixture } from '../render/__fixtures__/invoiceDocument'
import { renderToHtml } from '../render/__fixtures__/renderToHtml'
import { findBlock, setBandHeight } from './documentEdits'
import { createEditorStore, type IEditorStore } from './editorStore'
import { Inspector } from './Inspector'

function storeWith(doc: IDocument = invoiceDocumentFixture()): IEditorStore {
  return createEditorStore({ templateId: 't1', doc, rev: 1 })
}

async function inspectorHtml(store: IEditorStore, assets = [{ id: 'a1', label: 'logo.png' }]) {
  return renderToHtml(h(Inspector, { store, assets }))
}

test('with a band selected and no block the inspector edits the band height', async () => {
  const store = storeWith()
  store.select('header', [])

  const html = await inspectorHtml(store)

  assert.match(html, /data-band-height="header"/)
  assert.ok(html.includes(String(store.doc.value.bands.header.heightMm)))
})

test('the band height control writes through to the document', () => {
  const store = storeWith()

  store.commit(setBandHeight(store.doc.value, 'header', 90))

  assert.equal(store.doc.value.bands.header.heightMm, 90)
})

test('shrinking a band brings back the block that fell outside it', () => {
  const store = storeWith()
  const tallest = store.doc.value.bands.header.blocks[0]

  store.commit(setBandHeight(store.doc.value, 'header', 8))
  const block = findBlock(store.doc.value, 'header', tallest.id)!

  assert.ok(block.yMm + block.heightMm <= 8)
})
