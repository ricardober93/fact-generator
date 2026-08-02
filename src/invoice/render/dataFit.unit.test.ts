import assert from 'node:assert/strict'
import test from 'node:test'
import { TEMPLATE_PRESETS, findTemplatePreset } from '../templates/presets'
import { completeItems, dataFit, templateAccepts } from './dataFit'

const DOC = findTemplatePreset('chevron-slate')!.build()

const DATA = {
  emisor: { nombre: 'Acme S.L.' },
  cliente: { nombre: 'Ana Pérez' },
  factura: { numero: 'F-1', total: 145 },
}

const ITEMS = [{ descripcion: 'Producto uno', total: 70 }]

test('data that fits its template reports nothing', () => {
  assert.deepEqual(dataFit(DOC, DATA, ITEMS), { missing: [], orphan: [] })
})

test('a required path the invoice lacks is reported as missing', () => {
  const fit = dataFit(DOC, { emisor: { nombre: 'Acme' } }, ITEMS)

  assert.ok(fit.missing.includes('cliente.nombre'))
  assert.ok(fit.missing.includes('factura.total'))
  assert.deepEqual(fit.orphan, [])
})

test('a stored path the template no longer declares is reported as orphan', () => {
  const fit = dataFit(DOC, { ...DATA, cliente: { nombre: 'Ana', apodo: 'Anita' } }, ITEMS)

  assert.deepEqual(fit.orphan, ['cliente.apodo'])
  assert.deepEqual(fit.missing, [])
})

test('an orphan inside a line is reported under the item root', () => {
  const fit = dataFit(DOC, DATA, [{ descripcion: 'Uno', total: 1, color: 'rojo' }])

  assert.deepEqual(fit.orphan, ['item.color'])
})

test('renaming a binding leaves the old value orphaned and the new one missing', () => {
  const renamed = findTemplatePreset('chevron-slate')!.build()
  renamed.dataSchema = renamed.dataSchema.map((entry) =>
    entry.path === 'cliente.nombre' ? { ...entry, path: 'cliente.razonSocial' } : entry,
  )

  const fit = dataFit(renamed, DATA, ITEMS)

  assert.ok(fit.missing.includes('cliente.razonSocial'))
  assert.ok(fit.orphan.includes('cliente.nombre'))
})

test('the five presets all accept the same invoice', () => {
  for (const preset of TEMPLATE_PRESETS) {
    assert.equal(templateAccepts(preset.build(), DATA, ITEMS), true, `${preset.id} rejects it`)
  }
})

test('a template whose required paths are unmet does not accept the invoice', () => {
  assert.equal(templateAccepts(DOC, { emisor: { nombre: 'Acme' } }, ITEMS), false)
  assert.equal(templateAccepts(DOC, DATA, [{}]), false)
})

test('dataFit refuses a document without a schema', () => {
  assert.throws(() => dataFit({} as never, DATA, ITEMS), /dataSchema/)
})

test('a half typed line is left out of the preview instead of blocking it', () => {
  const half = [{ descripcion: 'Escribiendo' }]

  assert.deepEqual(completeItems(DOC, half), [])
  assert.deepEqual(completeItems(DOC, [...half, { descripcion: 'Lista', total: 10 }]), [
    { descripcion: 'Lista', total: 10 },
  ])
  assert.deepEqual(completeItems(DOC, []), [])
})
