import assert from 'node:assert/strict'
import test from 'node:test'
import { findTemplatePreset } from '../templates/presets'
import { formShapeOf } from './invoiceForm'
import {
  applyFieldChange,
  addLine,
  moveLine,
  readPath,
  removeLine,
  withLineAmount,
  withTotals,
  writePath,
} from './invoiceEdits'

const DOC = findTemplatePreset('chevron-slate')!.build()

test('the fields come from the schema, grouped by their first segment', () => {
  const shape = formShapeOf(DOC)
  const names = shape.groups.map((group) => group.name)

  assert.deepEqual(names, ['emisor', 'cliente', 'factura'])
  const cliente = shape.groups.find((group) => group.name === 'cliente')!
  assert.ok(cliente.fields.some((field) => field.path === 'cliente.nombre'))
})

test('item paths become columns and never fields', () => {
  const shape = formShapeOf(DOC)
  const fieldPaths = shape.groups.flatMap((group) => group.fields.map((field) => field.path))

  assert.ok(shape.columns.some((column) => column.path === 'item.descripcion'))
  assert.equal(
    fieldPaths.some((path) => path.startsWith('item.')),
    false,
  )
  assert.equal(shape.columns.find((column) => column.path === 'item.precio')?.key, 'precio')
})

test('the declared type and the required flag travel to the field', () => {
  const shape = formShapeOf(DOC)
  const all = [...shape.groups.flatMap((group) => group.fields), ...shape.columns]

  assert.equal(all.find((field) => field.path === 'factura.fecha')?.type, 'date')
  assert.equal(all.find((field) => field.path === 'item.precio')?.type, 'number')
  assert.equal(all.find((field) => field.path === 'cliente.nombre')?.required, true)
  assert.equal(all.find((field) => field.path === 'cliente.telefono')?.required, false)
})

test('a template with a new path brings its field with no form change', () => {
  const doc = findTemplatePreset('chevron-slate')!.build()
  doc.dataSchema = [...doc.dataSchema, { path: 'cliente.nif', type: 'string', required: false }]

  const cliente = formShapeOf(doc).groups.find((group) => group.name === 'cliente')!

  assert.ok(cliente.fields.some((field) => field.path === 'cliente.nif'))
})

test('formShapeOf refuses a document without a schema', () => {
  assert.throws(() => formShapeOf({} as never), /dataSchema/)
})

test('a nested path is written without mutating the source', () => {
  const data = { cliente: { nombre: 'Ana' } }

  const next = writePath(data, 'cliente.direccion', 'Calle 1')

  assert.equal(readPath(next, 'cliente.direccion'), 'Calle 1')
  assert.equal(readPath(next, 'cliente.nombre'), 'Ana')
  assert.deepEqual(data, { cliente: { nombre: 'Ana' } })
})

test('removing a line in the middle leaves the others untouched', () => {
  const items = [{ descripcion: 'A' }, { descripcion: 'B' }, { descripcion: 'C' }]

  assert.deepEqual(removeLine(items, 1), [{ descripcion: 'A' }, { descripcion: 'C' }])
  assert.equal(removeLine(items, 9), items)
  assert.equal(addLine(items).length, 4)
})

test('a line moves without losing any other', () => {
  const items = [{ descripcion: 'A' }, { descripcion: 'B' }, { descripcion: 'C' }]

  assert.deepEqual(moveLine(items, 2, 0), [
    { descripcion: 'C' },
    { descripcion: 'A' },
    { descripcion: 'B' },
  ])
  assert.equal(moveLine(items, 0, 9), items)
})

test('quantity and price fill the line amount', () => {
  assert.equal(withLineAmount({ cantidad: 3, precio: 25 }).total, 75)
  assert.deepEqual(withLineAmount({ descripcion: 'sin precio' }), { descripcion: 'sin precio' })
})

test('the totals are filled from the lines but stay ordinary data', () => {
  const data = withTotals({ factura: { impuestos: 21 } }, [{ total: 70 }, { total: 30 }])

  assert.equal(readPath(data, 'factura.base'), 100)
  assert.equal(readPath(data, 'factura.total'), 121)
})

test('a hand written amount survives because nothing recomputes it', () => {
  const item = withLineAmount({ cantidad: 3, precio: 25 })
  const corrected = { ...item, total: 70 }

  assert.equal(readPath(withTotals({}, [corrected]), 'factura.base'), 70)
})

test('typing the taxes recomputes the total, and any other field does not', () => {
  const items = [{ total: 100 }]
  const base = withTotals({}, items)

  const taxed = applyFieldChange(base, items, 'factura.impuestos', 21)
  assert.equal(readPath(taxed, 'factura.total'), 121)

  const named = applyFieldChange(taxed, items, 'cliente.nombre', 'Ana')
  assert.equal(readPath(named, 'factura.total'), 121)
})

test('a hand corrected total survives a later unrelated field change', () => {
  const items = [{ total: 100 }]
  const corrected = applyFieldChange(withTotals({}, items), items, 'factura.total', 95)

  const next = applyFieldChange(corrected, items, 'cliente.nombre', 'Ana')

  assert.equal(readPath(next, 'factura.total'), 95)
})

test('the invoice number is not a field anybody types', () => {
  const shape = formShapeOf(DOC)
  const paths = shape.groups.flatMap((group) => group.fields.map((field) => field.path))

  assert.ok(DOC.dataSchema.some((entry) => entry.path === 'factura.numero'))
  assert.equal(paths.includes('factura.numero'), false)
  assert.ok(paths.includes('factura.fecha'))
})
