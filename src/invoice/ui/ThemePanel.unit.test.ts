import assert from 'node:assert/strict'
import test from 'node:test'
import { h } from '@wabot-dev/framework/ui'
import { renderToHtml } from '../render/__fixtures__/renderToHtml'
import { findTemplatePreset } from '../templates/presets'
import { setThemeToken } from './documentEdits'
import { createEditorStore, type IEditorStore } from './editorStore'
import { ThemePanel } from './ThemePanel'

function bandedStore(): IEditorStore {
  const doc = findTemplatePreset('bars-navy')!.build()
  return createEditorStore({ templateId: 't1', doc, rev: 1 })
}

test('the panel lists every token the document declares', async () => {
  const store = bandedStore()

  const html = await renderToHtml(h(ThemePanel, { store }))

  for (const token of Object.keys(store.doc.value.theme)) {
    assert.ok(html.includes(`data-theme-token="${token}"`), `${token} has no field`)
  }
})

test('a colour token gets a swatch, a font stack does not', async () => {
  const store = bandedStore()

  const html = await renderToHtml(h(ThemePanel, { store }))

  assert.ok(html.includes('data-theme-swatch="accent"'))
  assert.equal(html.includes('data-theme-swatch="fontFamily"'), false)
})

test('the panel offers no way to add or remove a token', async () => {
  const store = bandedStore()

  const html = await renderToHtml(h(ThemePanel, { store }))

  assert.equal(/<button/.test(html), false)
  assert.equal(Object.keys(store.doc.value.theme).length > 0, true)
})

test('changing a colour repaints the theme and leaves every block alone', () => {
  const store = bandedStore()
  const before = store.doc.value

  store.commit(setThemeToken(before, 'accent', '#123456'))

  assert.equal(store.doc.value.theme.accent, '#123456')
  assert.deepEqual(store.doc.value.bands, before.bands)
})

test('a theme change is undone by the editor history', () => {
  const store = bandedStore()
  const original = store.doc.value.theme.accent

  store.commit(setThemeToken(store.doc.value, 'accent', '#123456'))
  store.undo()

  assert.equal(store.doc.value.theme.accent, original)
})
