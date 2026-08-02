import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToHtml } from '../__fixtures__/renderToHtml'
import { MISSING } from '../bind'
import { renderBlock } from '../bands'
import { applyDefaults, blockKinds, findBlockDefinition } from './registry'
import type { IRenderContext } from './defineBlock'

const CTX: IRenderContext = {
  theme: { text: '#111111', border: '#dddddd' },
  format: { locale: 'es-ES', currency: 'EUR' },
  resolve: () => MISSING,
  asset: () => null,
}

function ctxWith(overrides: Partial<IRenderContext>): IRenderContext {
  return { ...CTX, ...overrides }
}

test('every registered kind produces non empty markup', async () => {
  for (const kind of blockKinds()) {
    const asset = kind === 'image' ? () => 'data:image/png;base64,AAAA' : CTX.asset
    const html = await renderToHtml(renderBlock(applyDefaults(kind), ctxWith({ asset })))

    assert.ok(html.length > 0, `${kind} produced nothing`)
    assert.match(html, /position:\s*absolute/, `${kind} is not positioned`)
  }
})

test('an unknown kind fails naming the kind', () => {
  const block = { ...applyDefaults('box'), kind: 'qr' }

  assert.throws(() => renderBlock(block, CTX), /unknown block kind "qr"/)
})

test('block geometry reaches the css in millimetres', async () => {
  const block = applyDefaults('box', { xMm: 12.5, yMm: 3, widthMm: 60, heightMm: 8 })

  const html = await renderToHtml(renderBlock(block, CTX))

  assert.match(html, /left:\s*12\.5mm/)
  assert.match(html, /width:\s*60mm/)
  assert.equal(html.includes('px'), false)
})

test('a text fragment containing HTML is escaped, never interpreted', async () => {
  const block = applyDefaults('text', {
    widthMm: 40,
    heightMm: 6,
    props: { content: { fragments: [{ type: 'literal', text: '<b>Total</b>' }] } },
  })

  const html = await renderToHtml(renderBlock(block, CTX))

  assert.match(html, /&lt;b>Total&lt;\/b>/)
  assert.equal(html.includes('<b>'), false)
  assert.equal(html.includes('</b>'), false)
})

test('a script in a text fragment never becomes a script element', async () => {
  const block = applyDefaults('text', {
    widthMm: 40,
    heightMm: 6,
    props: { content: { fragments: [{ type: 'literal', text: '<script>alert(1)</script>' }] } },
  })

  const html = await renderToHtml(renderBlock(block, CTX))

  assert.equal(html.includes('<script'), false)
  assert.match(html, /&lt;script>alert\(1\)&lt;\/script>/)
})

test('text marks are emitted as style, not as concatenated html', async () => {
  const block = applyDefaults('text', {
    widthMm: 40,
    heightMm: 6,
    props: {
      content: { fragments: [{ type: 'literal', text: 'Total', marks: ['bold'] }] },
    },
  })

  const html = await renderToHtml(renderBlock(block, CTX))

  assert.match(html, /font-weight:\s*bold/)
})

test('a bound value is resolved and formatted', async () => {
  const block = applyDefaults('text', {
    widthMm: 40,
    heightMm: 6,
    props: {
      content: { fragments: [{ type: 'binding', path: 'factura.total', format: 'currency' }] },
    },
  })

  const html = await renderToHtml(renderBlock(block, ctxWith({ resolve: () => 1234.5 })))

  const expected = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(1234.5)
  assert.ok(html.includes(expected.replace(/ /g, '&nbsp;')) || html.includes(expected))
})

test('an image is emitted as a data uri img', async () => {
  const block = applyDefaults('image', { widthMm: 30, heightMm: 15 })

  const html = await renderToHtml(
    renderBlock(block, ctxWith({ asset: () => 'data:image/png;base64,AAAA' })),
  )

  assert.match(html, /<img[^>]+src="data:image\/png;base64,AAAA"/)
})

test('an svg asset is never inlined as markup', async () => {
  const svg = 'data:image/svg+xml;base64,PHN2Zz48c2NyaXB0Pjwvc2NyaXB0Pjwvc3ZnPg=='
  const block = applyDefaults('image', { widthMm: 30, heightMm: 15 })

  const html = await renderToHtml(renderBlock(block, ctxWith({ asset: () => svg })))

  assert.match(html, /<img[^>]+src="data:image\/svg\+xml;base64,/)
  assert.equal(html.includes('<svg'), false)
  assert.equal(html.includes('<script'), false)
})

test('a missing asset leaves a sized hole without an img', async () => {
  const block = applyDefaults('image', { widthMm: 30, heightMm: 15 })

  const html = await renderToHtml(renderBlock(block, CTX))

  assert.equal(html.includes('<img'), false)
  assert.match(html, /width:\s*30mm/)
})

test('every definition now carries a render function', () => {
  for (const kind of blockKinds()) {
    assert.equal(typeof findBlockDefinition(kind)!.render, 'function', `${kind} has no render`)
  }
})

const TABLE_CELLS = [
  { label: 'Concepto', path: 'item.descripcion', widthMm: 100, align: 'left' as const },
  {
    label: 'Total',
    path: 'item.total',
    format: 'currency',
    widthMm: 30,
    align: 'right' as const,
  },
]

test('a table paints one cell per column with its formatted value', async () => {
  const block = applyDefaults('table', { props: { cells: TABLE_CELLS } })
  const resolve = (path: string) => (path === 'item.total' ? 63 : 'Maquetación')

  const html = await renderToHtml(renderBlock(block, ctxWith({ resolve })))

  assert.match(html, /Maquetación/)
  assert.match(html, /63,00/)
  assert.match(html, /100mm/)
  assert.match(html, /30mm/)
})

test('a table header paints the literal labels, never as markup', async () => {
  const cells = [{ label: '<b>Total</b>', path: '', widthMm: 30, align: 'right' as const }]
  const block = applyDefaults('table', { props: { cells } })
  const renderHeader = findBlockDefinition('table')!.renderHeader!

  const html = await renderToHtml(renderHeader(block, CTX))

  assert.match(html, /&lt;b/)
  assert.match(html, /Total/)
  assert.equal(html.includes('<b>'), false)
})

test('a list stacks each label with the value of its path', async () => {
  const cells = [{ label: 'Subtotal', path: 'factura.base', widthMm: 30, align: 'right' as const }]
  const block = applyDefaults('list', { props: { cells } })

  const html = await renderToHtml(renderBlock(block, ctxWith({ resolve: () => 300 })))

  assert.match(html, /Subtotal/)
  assert.match(html, /300/)
})

test('a cell whose path does not resolve paints empty without failing', async () => {
  const block = applyDefaults('table', { props: { cells: TABLE_CELLS } })

  const html = await renderToHtml(renderBlock(block, CTX))

  assert.ok(html.length > 0)
  assert.equal(html.includes('undefined'), false)
  assert.equal(html.includes('Symbol'), false)
})

test('a rotated box carries its rotation into the css', async () => {
  const block = applyDefaults('box', { props: { rotationDeg: 45 } })

  const html = await renderToHtml(renderBlock(block, CTX))

  assert.match(html, /transform:\s*rotate\(45deg\)/)
})

test('a new box is not rotated and rotating one leaves its geometry alone', async () => {
  const fresh = applyDefaults('box')
  const rotated = applyDefaults('box', { props: { rotationDeg: 45 } })

  assert.equal(fresh.props.rotationDeg, 0)
  assert.deepEqual(
    [rotated.xMm, rotated.yMm, rotated.widthMm, rotated.heightMm],
    [fresh.xMm, fresh.yMm, fresh.widthMm, fresh.heightMm],
  )
  const html = await renderToHtml(renderBlock(rotated, CTX))
  assert.equal(html.includes('transform-origin'), false)
})

test('a new table paints its header with the same token as its rows', () => {
  const block = applyDefaults('table')

  assert.equal(block.props.headerColor, block.props.color)
})

test('a table header paints with its own colour, the rows with theirs', async () => {
  const block = applyDefaults('table', {
    props: { cells: TABLE_CELLS, color: '@text', headerColor: '@onAccent' },
  })
  const definition = findBlockDefinition('table')!

  const header = await renderToHtml(definition.renderHeader!(block, CTX))
  const row = await renderToHtml(definition.render(block, CTX))

  assert.match(header, /color:\s*var\(--onAccent\)/)
  assert.match(row, /color:\s*var\(--text\)/)
  assert.equal(row.includes('--onAccent'), false)
})
