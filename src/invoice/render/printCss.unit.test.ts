import assert from 'node:assert/strict'
import test from 'node:test'
import { A4_PORTRAIT, DEFAULT_THEME } from './document'
import { documentCss, pageCss, themeStyle, tokenVariable } from './printCss'

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

test('the footer is only fixed inside a print media query', () => {
  const css = pageCss(A4_PORTRAIT)

  assert.match(css, /@media print \{ \.wb-page-footer \{ position: fixed; bottom: 0;/)
  assert.equal(css.indexOf('position: fixed') > css.indexOf('@media print'), true)
})

test('the printed footer spans the useful column, not the paper', () => {
  const css = pageCss({ ...A4_PORTRAIT, marginLeftMm: 20, marginRightMm: 25 })

  assert.match(css, /\.wb-page-footer \{[^}]*width: 165mm;/)
  assert.doesNotMatch(css, /\.wb-page-footer \{[^}]*left:/)
})

test('printing keeps the declared colours instead of dropping them', () => {
  const css = pageCss(A4_PORTRAIT)

  assert.match(
    css,
    /@media print \{ \* \{ -webkit-print-color-adjust: exact; print-color-adjust: exact; \} \}/,
  )
})

test('the colour request only applies while printing', () => {
  const css = pageCss(A4_PORTRAIT)
  const outsidePrint = css.replace(/@media print \{[^@]*\}/g, '')

  assert.equal(outsidePrint.includes('print-color-adjust'), false)
})

test('a theme with an alternate fill repaints the row fill token', () => {
  const css = documentCss({ ...DEFAULT_THEME, rowFill: '#ffffff', rowAltFill: '#eeeeee' })

  assert.match(css, /tbody tr:nth-child\(even\) td \{ --rowFill: var\(--rowAltFill\); \}/)
})

test('a theme without an alternate fill gets no alternating rule', () => {
  assert.equal(documentCss({ ...DEFAULT_THEME, rowFill: '#ffffff' }), '')
})

test('the page rules never carry the alternating rule', () => {
  assert.equal(pageCss(A4_PORTRAIT).includes('nth-child'), false)
})
