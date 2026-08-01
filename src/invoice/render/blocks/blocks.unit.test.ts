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
