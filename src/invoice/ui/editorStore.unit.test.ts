import assert from 'node:assert/strict'
import test from 'node:test'
import { emptyDocument, type IDocument } from '../render/document'
import { invoiceDocumentFixture } from '../render/__fixtures__/invoiceDocument'
import { addBlock, setBlockProp } from './documentEdits'
import { createEditorStore, UNDO_LIMIT } from './editorStore'

function storeWith(doc: IDocument = emptyDocument()) {
  return createEditorStore({ templateId: 't1', doc, rev: 1 })
}

test('three changes and two undos land on the first change', () => {
  const store = storeWith()
  const first = addBlock(store.doc.value, 'header', 'box')
  store.commit(first.doc)
  const second = addBlock(store.doc.value, 'header', 'text')
  store.commit(second.doc)
  const third = addBlock(store.doc.value, 'header', 'line')
  store.commit(third.doc)

  store.undo()
  store.undo()

  assert.equal(store.doc.value.bands.header.blocks.length, 1)
  assert.equal(store.canUndo(), true)
  assert.equal(store.canRedo(), true)
})

test('redo recovers what undo put back', () => {
  const store = storeWith()
  store.commit(addBlock(store.doc.value, 'header', 'box').doc)
  const twoBlocks = addBlock(store.doc.value, 'header', 'text').doc
  store.commit(twoBlocks)

  store.undo()
  assert.equal(store.doc.value.bands.header.blocks.length, 1)
  store.redo()

  assert.deepEqual(store.doc.value, twoBlocks)
  assert.equal(store.canRedo(), false)
})

test('a new change throws away what was redoable', () => {
  const store = storeWith()
  store.commit(addBlock(store.doc.value, 'header', 'box').doc)
  store.commit(addBlock(store.doc.value, 'header', 'text').doc)

  store.undo()
  assert.equal(store.canRedo(), true)
  store.commit(addBlock(store.doc.value, 'header', 'line').doc)

  assert.equal(store.canRedo(), false)
})

test('undoing past the beginning is a no-op', () => {
  const store = storeWith()
  const original = store.doc.value

  store.undo()
  store.redo()

  assert.equal(store.doc.value, original)
  assert.equal(store.canUndo(), false)
})

test('the undo stack stops growing at its limit', () => {
  const store = storeWith()
  for (let index = 0; index < UNDO_LIMIT + 10; index += 1) {
    store.commit(addBlock(store.doc.value, 'header', 'box').doc)
  }

  let undone = 0
  while (store.canUndo()) {
    store.undo()
    undone += 1
    assert.ok(undone <= UNDO_LIMIT, 'the stack grew past its limit')
  }

  assert.equal(undone, UNDO_LIMIT)
  assert.equal(store.doc.value.bands.header.blocks.length, 10)
})

test('undo restores a snapshot that later edits cannot reach', () => {
  const store = storeWith(invoiceDocumentFixture())
  const before = structuredClone(store.doc.value)

  store.commit(setBlockProp(store.doc.value, 'header', 'issuer', 'align', 'right'))
  store.commit(setBlockProp(store.doc.value, 'header', 'issuer', 'align', 'center'))
  store.undo()
  store.undo()

  assert.deepEqual(store.doc.value, before)
})

test('a selection never mixes bands', () => {
  const store = storeWith()

  store.select('header', ['abc'])
  store.toggleInSelection('header', 'def')
  assert.deepEqual(store.selection.value, { band: 'header', blockIds: ['abc', 'def'] })

  store.toggleInSelection('header', 'abc')
  assert.deepEqual(store.selection.value?.blockIds, ['def'])

  store.toggleInSelection('detail', 'xyz')
  assert.deepEqual(store.selection.value, { band: 'detail', blockIds: ['xyz'] })

  store.clearSelection()
  assert.equal(store.selection.value, null)
})

test('the clipboard and the zoom live outside the document', () => {
  const store = storeWith()
  const before = structuredClone(store.doc.value)

  store.clipboard.value = [store.doc.value.bands.header.blocks[0]]
  store.setZoom(2)
  store.setZoom(99)

  assert.equal(store.zoom.value, 4)
  assert.deepEqual(store.doc.value, before)
  assert.equal(store.canUndo(), false)
  assert.throws(() => store.setZoom(Number.NaN), /finite/)
})

test('the store refuses to start without a template, document or revision', () => {
  const doc = emptyDocument()

  assert.throws(() => createEditorStore({ templateId: '', doc, rev: 1 }), /template id/)
  assert.throws(
    () => createEditorStore({ templateId: 't', doc: null as unknown as IDocument, rev: 1 }),
    /document/,
  )
  assert.throws(() => createEditorStore({ templateId: 't', doc, rev: Number.NaN }), /revision/)
})
