import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { applyDefaults } from './blocks/registry'
import { emptyDocument } from './document'
import { MissingDataError, render } from './render'
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

test('rendering twice produces identical markup', async () => {
  const first = await renderToHtml(render(fullInput()))
  const second = await renderToHtml(render(fullInput()))

  assert.equal(first, second)
})

test('rendering does not mutate its inputs', async () => {
  const input = fullInput()
  const snapshot = JSON.stringify(input)

  await renderToHtml(render(input))

  assert.equal(JSON.stringify(input), snapshot)
})

test('the detail band repeats once per item, the others once', async () => {
  const html = await renderToHtml(render(fullInput()))

  const rows = html.match(/<tr>/g) ?? []
  assert.equal(rows.length, INVOICE_ITEMS.length + 1)

  const issuerOccurrences = html.split('Acme S.L.').length - 1
  assert.equal(issuerOccurrences, 1)
})

test('each detail repetition shows its own item', async () => {
  const html = await renderToHtml(render(fullInput()))

  for (const item of INVOICE_ITEMS) {
    assert.ok(html.includes(item.descripcion), `${item.descripcion} is missing`)
  }
})

test('the detail header lives in thead and the items in tbody', async () => {
  const html = await renderToHtml(render(fullInput()))

  const thead = html.slice(html.indexOf('<thead>'), html.indexOf('</thead>'))
  const tbody = html.slice(html.indexOf('<tbody>'), html.indexOf('</tbody>'))

  assert.ok(thead.includes('Descripción'))
  assert.ok(tbody.includes('Diseño de marca'))
  assert.equal(thead.includes('Diseño de marca'), false)
})

test('an empty item collection still renders', async () => {
  const html = await renderToHtml(render({ ...fullInput(), items: [] }))

  assert.match(html, /<tbody><\/tbody>/)
  assert.ok(html.includes('Acme S.L.'))
})

test('the page footer is emitted once and in flow on screen', async () => {
  const html = await renderToHtml(render(fullInput()))

  const footers = html.match(/class="wb-page-footer"/g) ?? []
  assert.equal(footers.length, 1)
  assert.ok(html.includes('Gracias por su confianza'))

  const body = html.slice(html.indexOf('</style>'))
  assert.doesNotMatch(body, /position:\s*fixed/)
})

test('printing fixes the footer to the page, across the useful column', async () => {
  const html = await renderToHtml(render(fullInput()))

  const style = html.slice(html.indexOf('<style>'), html.indexOf('</style>'))
  assert.match(style, /@media print \{ \.wb-page-footer \{ position: fixed; bottom: 0;/)
  assert.match(style, /width: 180mm;/)
  assert.doesNotMatch(style, /width: 210mm/)
})

test('each band and each block names itself in the markup', async () => {
  const html = await renderToHtml(render(fullInput()))

  for (const band of ['header', 'detailHeader', 'detail', 'summary', 'pageFooter']) {
    assert.ok(html.includes(`data-band="${band}"`), `${band} is missing`)
  }

  const doc = invoiceDocumentFixture()
  for (const block of doc.bands.header.blocks) {
    assert.ok(html.includes(`data-block="${block.id}"`), `${block.id} is missing`)
  }
})

test('the theme travels as custom properties on the root', async () => {
  const html = await renderToHtml(render(fullInput()))

  assert.match(html, /--primary:\s*#0a58ca/)
  assert.match(html, /--fontSizeBase:\s*10pt/)
})

test('a parameter repaints without changing any block markup', async () => {
  const plain = await renderToHtml(render(fullInput()))
  const tinted = await renderToHtml(render({ ...fullInput(), params: { color: '#ff6600' } }))

  assert.notEqual(plain, tinted)
  assert.match(tinted, /--primary:\s*#ff6600/)

  const bodyOf = (html: string) => html.slice(html.indexOf('<style>'))
  assert.equal(bodyOf(plain), bodyOf(tinted))
})

test('the print css declares the page size', async () => {
  const html = await renderToHtml(render(fullInput()))

  assert.match(html, /@page \{ size: 210mm 297mm/)
})

test('a missing required path stops the render naming every absence', () => {
  const input = { ...fullInput(), data: { emisor: { nombre: 'Acme' } } }

  assert.throws(
    () => render(input),
    (error: unknown) => {
      assert.ok(error instanceof MissingDataError)
      assert.deepEqual(error.paths, ['cliente.nombre', 'factura.numero', 'factura.total'])
      return true
    },
  )
})

test('a missing required item path is reported', () => {
  const input = { ...fullInput(), items: [{ descripcion: 'x', cantidad: 1 }] }

  assert.throws(() => render(input), /item\.total/)
})

test('an optional missing path renders empty without failing', async () => {
  const data = { ...INVOICE_DATA, emisor: { nombre: 'Acme S.L.' } }

  const html = await renderToHtml(render({ ...fullInput(), data }))

  assert.ok(html.includes('Acme S.L.'))
  assert.equal(html.includes('Gracias por su confianza'), false)
})

test('a document with no bindings renders with no data at all', async () => {
  const doc = emptyDocument()
  doc.bands.header.blocks = [applyDefaults('box', { widthMm: 40, heightMm: 20 })]

  const html = await renderToHtml(render({ doc }))

  assert.ok(html.length > 0)
})

test('the golden invoice markup is unchanged', async () => {
  const expected = readFileSync(
    new URL('./__fixtures__/invoice.golden.html', import.meta.url),
    'utf8',
  )

  const html = await renderToHtml(render(fullInput()))

  assert.equal(html + '\n', expected)
})
