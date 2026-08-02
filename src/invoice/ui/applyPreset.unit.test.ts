import assert from 'node:assert/strict'
import test from 'node:test'
import { validateDocument } from '../render/validateDocument'
import { invoiceDocumentFixture } from '../render/__fixtures__/invoiceDocument'
import { findTemplatePreset } from '../templates/presets'
import { applyPresetToStore } from './applyPreset'
import { createEditorStore, type IEditorStore } from './editorStore'

const YES = () => true
const NO = () => false

function storeWithFixture(): IEditorStore {
  return createEditorStore({ templateId: 't1', doc: invoiceDocumentFixture(), rev: 1 })
}

test('applying a design replaces the whole document with a valid one', () => {
  const store = storeWithFixture()

  const applied = applyPresetToStore(store, 'bars-navy', YES)

  assert.equal(applied, true)
  assert.deepEqual(store.doc.value, findTemplatePreset('bars-navy')!.build())
  assert.deepEqual(validateDocument(store.doc.value), [])
  assert.equal(store.selection.value, null)
})

test('applying a design is undone like any other edit', () => {
  const store = storeWithFixture()
  const before = store.doc.value

  applyPresetToStore(store, 'mosaic-green', YES)
  store.undo()

  assert.deepEqual(store.doc.value, before)
})

test('cancelling the confirmation changes nothing', () => {
  const store = storeWithFixture()
  const before = store.doc.value

  const applied = applyPresetToStore(store, 'bars-navy', NO)

  assert.equal(applied, false)
  assert.equal(store.doc.value, before)
  assert.equal(store.canUndo(), false)
})

test('an unknown design never asks and never applies', () => {
  const store = storeWithFixture()
  const before = store.doc.value
  let asked = false

  const applied = applyPresetToStore(store, 'no-existe', () => {
    asked = true
    return true
  })

  assert.equal(applied, false)
  assert.equal(asked, false)
  assert.equal(store.doc.value, before)
})

test('applying a design does not touch the stored revision', () => {
  const store = storeWithFixture()

  applyPresetToStore(store, 'chevron-amber', YES)

  assert.equal(store.rev.value, 1)
  assert.equal(store.status.value.state, 'idle')
})
