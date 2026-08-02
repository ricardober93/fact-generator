import assert from 'node:assert/strict'
import test from 'node:test'
import { applyDefaults } from './blocks/registry'
import { render } from './render'
import { validateDocument } from './validateDocument'
import { invoiceDocumentFixture } from './__fixtures__/invoiceDocument'
import { INVOICE_DATA, INVOICE_ITEMS, renderToHtml } from './__fixtures__/renderToHtml'

function fullInput() {
  return {
    doc: invoiceDocumentFixture(),
    data: INVOICE_DATA,
    items: INVOICE_ITEMS,
    assets: { logo: 'data:image/png;base64,AAAA' },
  }
}

test('alternating rows are driven by the theme, never by per-row markup', async () => {
  const doc = invoiceDocumentFixture()
  doc.theme = { ...doc.theme, rowFill: '#ffffff', rowAltFill: '#eeeeee' }
  doc.bands.detail.blocks = [
    applyDefaults('box', {
      id: 'rowBand',
      widthMm: 180,
      heightMm: 8,
      props: { fill: '@rowFill' },
    }),
  ]
  const items = [1, 2, 3, 4].map((n) => ({ descripcion: `Item ${n}`, cantidad: n, total: n }))

  const html = await renderToHtml(render({ ...fullInput(), doc, items }))
  const body = html.slice(html.indexOf('<tbody>'))

  assert.equal((body.match(/<tr>/g) ?? []).length, items.length)
  assert.equal((body.match(/background:var\(--rowFill\)/g) ?? []).length, items.length)
  assert.equal(body.includes('--rowAltFill'), false)
  assert.match(html, /tbody tr:nth-child\(even\) td \{ --rowFill: var\(--rowAltFill\); \}/)
})

test('marking blocks as decorative changes neither the markup nor the validation', async () => {
  const plain = invoiceDocumentFixture()
  const marked = invoiceDocumentFixture()
  marked.bands.header.blocks = marked.bands.header.blocks.map((block) => ({
    ...block,
    decorative: true,
  }))

  const plainHtml = await renderToHtml(render({ ...fullInput(), doc: plain }))
  const markedHtml = await renderToHtml(render({ ...fullInput(), doc: marked }))

  assert.equal(markedHtml, plainHtml)
  assert.deepEqual(validateDocument(marked), validateDocument(plain))
  assert.deepEqual(validateDocument(marked), [])
})
