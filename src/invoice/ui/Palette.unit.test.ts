import assert from 'node:assert/strict'
import test from 'node:test'
import { h } from '@wabot-dev/framework/ui'
import { blockKinds } from '../render/blocks/registry'
import { invoiceDocumentFixture } from '../render/__fixtures__/invoiceDocument'
import { renderToHtml } from '../render/__fixtures__/renderToHtml'
import { Palette } from './Palette'
import { createEditorStore, type IEditorStore } from './editorStore'

function storeWith(): IEditorStore {
  return createEditorStore({ templateId: 't1', doc: invoiceDocumentFixture(), rev: 1 })
}

async function paletteHtml(store: IEditorStore): Promise<string> {
  return renderToHtml(h(Palette, { store }))
}

test('the palette offers exactly the kinds the registry declares', async () => {
  const html = await paletteHtml(storeWith())

  for (const kind of blockKinds()) {
    assert.ok(html.includes(`data-palette-kind="${kind}"`), `${kind} is missing`)
  }
  const offered = html.match(/data-palette-kind="[^"]+"/g) ?? []
  assert.equal(offered.length, blockKinds().length)
})

test('without a selected band the palette invites to drag', async () => {
  const store = storeWith()

  const idle = await paletteHtml(store)
  store.select('detail', [])
  const ready = await paletteHtml(store)

  assert.match(idle, /Arrastra un bloque/)
  assert.doesNotMatch(ready, /Arrastra un bloque/)
  assert.match(ready, /data-palette-kind="table"/)
})
