import assert from 'node:assert/strict'
import test from 'node:test'
import { h } from '@wabot-dev/framework/ui'
import { render } from '../render/render'
import { renderToHtml } from '../render/__fixtures__/renderToHtml'
import { findTemplatePreset } from '../templates/presets'
import { InvoicePaper } from './InvoicePaper'

const DOC = findTemplatePreset('chevron-slate')!.build()

const DATA = {
  emisor: { nombre: 'Acme S.L.' },
  cliente: { nombre: 'Ana Pérez' },
  factura: { numero: 'F-1', total: 145 },
}

const ITEMS = [{ descripcion: 'Producto uno', total: 70 }]

function paper(data: Record<string, unknown>, items: Record<string, unknown>[]) {
  return renderToHtml(h(InvoicePaper, { doc: DOC, data, items, params: {}, assets: {} }))
}

test('the viewer paints what the form holds', async () => {
  const html = await paper(DATA, ITEMS)

  assert.ok(html.includes('Ana Pérez'))
  assert.ok(html.includes('Producto uno'))
})

test('typing another customer repaints without any save', async () => {
  const first = await paper(DATA, ITEMS)
  const second = await paper({ ...DATA, cliente: { nombre: 'Luis Gómez' } }, ITEMS)

  assert.ok(first.includes('Ana Pérez'))
  assert.ok(second.includes('Luis Gómez'))
  assert.equal(second.includes('Ana Pérez'), false)
})

test('the viewer paints the same document the embed would', async () => {
  const mine = await paper(DATA, ITEMS)
  const embed = await renderToHtml(render({ doc: DOC, data: DATA, items: ITEMS, assets: {} }))

  assert.ok(mine.includes(embed))
})

test('an incomplete form says what is missing instead of blowing up', async () => {
  const html = await paper({ emisor: { nombre: 'Acme' } }, ITEMS)

  assert.match(html, /data-missing="\d+"/)
  assert.ok(html.includes('cliente.nombre'))
  assert.equal(html.includes('data-band'), false)
})

test('a different design paints the same data', async () => {
  const bars = findTemplatePreset('bars-navy')!.build()

  const html = await renderToHtml(
    h(InvoicePaper, { doc: bars, data: DATA, items: ITEMS, params: {}, assets: {} }),
  )

  assert.ok(html.includes('Ana Pérez'))
  assert.ok(html.includes('LOGO HERE'))
})
