import assert from 'node:assert/strict'
import test from 'node:test'
import { A4_PORTRAIT, DEFAULT_THEME } from './document'
import { pageCss, themeStyle, tokenVariable } from './printCss'

test('every theme token becomes a custom property', () => {
  const style = themeStyle(DEFAULT_THEME)

  for (const token of Object.keys(DEFAULT_THEME)) {
    assert.ok(tokenVariable(token) in style, `${token} is missing`)
  }
  assert.equal(style['--primary'], '#0a58ca')
})

test('the page css declares size and margins in millimetres', () => {
  const css = pageCss(A4_PORTRAIT)

  assert.match(css, /@page \{ size: 210mm 297mm;/)
  assert.match(css, /margin: 15mm 15mm 15mm 15mm;/)
})

test('a non A4 page is reflected verbatim', () => {
  const css = pageCss({ ...A4_PORTRAIT, widthMm: 216, heightMm: 279, marginTopMm: 10 })

  assert.match(css, /size: 216mm 279mm/)
  assert.match(css, /margin: 10mm/)
})
