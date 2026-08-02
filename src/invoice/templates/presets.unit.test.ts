import assert from 'node:assert/strict'
import test from 'node:test'
import { render } from '../render/render'
import { sampleDataFor } from '../render/sampleData'
import { usableWidthMm } from '../render/document'
import { validateDocument } from '../render/validateDocument'
import { renderToHtml } from '../render/__fixtures__/renderToHtml'
import {
  findTemplatePreset,
  TEMPLATE_FAMILIES,
  TEMPLATE_PRESETS,
  TEMPLATE_PRESET_IDS,
} from './presets'

const ITEMS = [
  { numero: 1, descripcion: 'Producto uno', precio: 70, cantidad: 1, total: 70 },
  { numero: 2, descripcion: 'Producto dos', precio: 25, cantidad: 2, total: 50 },
]

const DATA = {
  emisor: { nombre: 'Acme S.L.' },
  cliente: { nombre: 'Ana Pérez' },
  factura: { numero: 'F-2026-014', fecha: '2026-08-01', base: 120, impuestos: 25, total: 145 },
}

test('every preset builds a document the model accepts', () => {
  for (const preset of TEMPLATE_PRESETS) {
    assert.deepEqual(validateDocument(preset.build()), [], `${preset.id} is invalid`)
  }
})

test('every preset announces what it takes to choose it', () => {
  for (const preset of TEMPLATE_PRESETS) {
    assert.ok(preset.name.length > 0, `${preset.id} has no name`)
    assert.ok(preset.description.length > 0, `${preset.id} has no description`)
    assert.ok(TEMPLATE_FAMILIES.includes(preset.family), `${preset.id} has no known family`)
  }
})

test('building the same preset twice gives the same document', () => {
  for (const preset of TEMPLATE_PRESETS) {
    assert.deepEqual(preset.build(), preset.build(), `${preset.id} is not reproducible`)
  }
})

test('preset ids are unique and resolvable by id', () => {
  assert.equal(new Set(TEMPLATE_PRESET_IDS).size, TEMPLATE_PRESET_IDS.length)
  for (const id of TEMPLATE_PRESET_IDS) {
    assert.equal(findTemplatePreset(id)?.id, id)
  }
  assert.equal(findTemplatePreset('nope'), null)
  assert.equal(findTemplatePreset(''), null)
})

test('every preset paints the invoice data it declares', async () => {
  for (const preset of TEMPLATE_PRESETS) {
    const html = await renderToHtml(render({ doc: preset.build(), data: DATA, items: ITEMS }))

    assert.ok(html.includes('Ana Pérez'), `${preset.id} lost the customer`)
    assert.ok(html.includes('F-2026-014'), `${preset.id} lost the invoice number`)
    assert.ok(html.includes('Producto dos'), `${preset.id} lost the second item`)
    assert.equal((html.match(/<tr>/g) ?? []).length, ITEMS.length + 1, `${preset.id} rows`)
  }
})

test('every preset paints in the editor with sample data alone', async () => {
  for (const preset of TEMPLATE_PRESETS) {
    const doc = preset.build()
    const sample = sampleDataFor(doc)

    const html = await renderToHtml(render({ doc, data: sample.data, items: [sample.item] }))

    assert.ok(html.length > 0, `${preset.id} painted nothing`)
  }
})

test('every preset uses the full width of its page', () => {
  for (const preset of TEMPLATE_PRESETS) {
    const doc = preset.build()
    const widthMm = usableWidthMm(doc.page)
    const blocks = Object.values(doc.bands).flatMap((band) => band.blocks)
    const rightEdgeMm = Math.max(...blocks.map((block) => block.xMm + block.widthMm))

    assert.ok(rightEdgeMm <= widthMm, `${preset.id} overflows its page`)
    assert.ok(rightEdgeMm > widthMm * 0.9, `${preset.id} leaves the right side empty`)
  }
})

test('every preset exposes the accent colour as an embed parameter', () => {
  for (const preset of TEMPLATE_PRESETS) {
    const doc = preset.build()
    const color = doc.params.find((param) => param.name === 'color')

    assert.ok(color, `${preset.id} has no colour parameter`)
    assert.ok(doc.theme[color.token], `${preset.id} points at an undeclared token`)
  }
})

test('the banded preset alternates its rows through the theme', () => {
  const doc = findTemplatePreset('bars-navy')!.build()

  assert.ok(doc.theme.rowFill)
  assert.ok(doc.theme.rowAltFill)
  assert.ok(doc.bands.detail.blocks.some((block) => block.props.fill === '@rowFill'))
})
