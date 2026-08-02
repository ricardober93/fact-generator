import assert from 'node:assert/strict'
import test from 'node:test'
import { h } from '@wabot-dev/framework/ui'
import { renderToHtml } from '../render/__fixtures__/renderToHtml'
import { invoiceDocumentFixture } from '../render/__fixtures__/invoiceDocument'
import { findTemplatePreset } from '../templates/presets'
import { createEditorStore, type IEditorStore } from './editorStore'
import { LayersPanel } from './LayersPanel'

function storeFor(id: string): IEditorStore {
  const doc = findTemplatePreset(id)!.build()
  return createEditorStore({ templateId: 't1', doc, rev: 1 })
}

test('the decoration of a band collapses into a single entry', async () => {
  const store = storeFor('mosaic-red')
  store.select('header', [])
  const blocks = store.doc.value.bands.header.blocks
  const decorative = blocks.filter((block) => block.decorative)
  const plain = blocks.filter((block) => !block.decorative)

  const html = await renderToHtml(h(LayersPanel, { store }))

  assert.ok(decorative.length > 60, 'the mosaic should carry its decoration')
  assert.match(html, new RegExp(`data-decoration-group="${decorative.length}"`))
  assert.equal((html.match(/data-decoration-group=/g) ?? []).length, 1)
  for (const block of plain) {
    assert.ok(html.includes(`data-layer="${block.id}"`), `${block.id} lost its row`)
  }
})

test('a decorative block is still reachable inside the group', async () => {
  const store = storeFor('mosaic-red')
  store.select('header', [])
  const decorative = store.doc.value.bands.header.blocks.find((block) => block.decorative)!

  const html = await renderToHtml(h(LayersPanel, { store }))

  assert.ok(html.includes(`data-layer="${decorative.id}"`))
})

test('a band with no decoration renders no group at all', async () => {
  const store = createEditorStore({ templateId: 't1', doc: invoiceDocumentFixture(), rev: 1 })
  store.select('header', [])

  const html = await renderToHtml(h(LayersPanel, { store }))

  assert.equal(html.includes('data-decoration-group'), false)
  for (const block of store.doc.value.bands.header.blocks) {
    assert.ok(html.includes(`data-layer="${block.id}"`))
  }
})
