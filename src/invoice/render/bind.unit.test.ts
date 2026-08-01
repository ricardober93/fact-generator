import assert from 'node:assert/strict'
import test from 'node:test'
import { MISSING, missingRequiredPaths, resolveInScope, resolvePath } from './bind'
import { emptyDocument } from './document'
import { formatValue } from './format'

const DATA = {
  emisor: { nombre: 'Acme', direccion: { ciudad: 'Quito' } },
  cliente: { nombre: 'Ana', nif: null },
  items: [{ descripcion: 'Diseño', total: 120 }],
}

test('a nested path resolves', () => {
  assert.equal(resolvePath(DATA, 'emisor.direccion.ciudad'), 'Quito')
})

test('a collection index resolves', () => {
  assert.equal(resolvePath(DATA, 'items[0].descripcion'), 'Diseño')
})

test('a path through a missing branch does not throw', () => {
  assert.equal(resolvePath(DATA, 'cliente.direccion.ciudad'), MISSING)
})

test('a present but null value counts as missing', () => {
  assert.equal(resolvePath(DATA, 'cliente.nif'), MISSING)
})

test('a path that lands on an object counts as missing', () => {
  assert.equal(resolvePath(DATA, 'emisor.direccion'), MISSING)
})

test('a missing optional value formats as empty', () => {
  assert.equal(formatValue(MISSING, undefined, { locale: 'es-ES', currency: 'EUR' }), '')
})

test('inside the detail band a path resolves against the current item', () => {
  const scope = { data: DATA, item: { total: 42 }, itemRoot: 'item' }

  assert.equal(resolveInScope(scope, 'item.total'), 42)
  assert.equal(resolveInScope(scope, 'cliente.nombre'), 'Ana')
})

test('every missing required path is reported, not just the first', () => {
  const doc = emptyDocument()
  doc.dataSchema = [
    { path: 'emisor.nombre', type: 'string', required: true },
    { path: 'cliente.nombre', type: 'string', required: true },
    { path: 'factura.numero', type: 'string', required: true },
    { path: 'cliente.nif', type: 'string', required: false },
  ]

  const missing = missingRequiredPaths(doc, {}, [], 'item')

  assert.deepEqual(missing, ['emisor.nombre', 'cliente.nombre', 'factura.numero'])
})

test('an optional missing path is never reported', () => {
  const doc = emptyDocument()
  doc.dataSchema = [{ path: 'cliente.nif', type: 'string', required: false }]

  assert.deepEqual(missingRequiredPaths(doc, DATA, [], 'item'), [])
})

test('a required item path missing in any item is reported', () => {
  const doc = emptyDocument()
  doc.dataSchema = [{ path: 'item.total', type: 'number', required: true }]

  const complete = missingRequiredPaths(doc, DATA, [{ total: 1 }, { total: 2 }], 'item')
  const incomplete = missingRequiredPaths(doc, DATA, [{ total: 1 }, {}], 'item')

  assert.deepEqual(complete, [])
  assert.deepEqual(incomplete, ['item.total'])
})

test('with no items a required item path is not reported', () => {
  const doc = emptyDocument()
  doc.dataSchema = [{ path: 'item.total', type: 'number', required: true }]

  assert.deepEqual(missingRequiredPaths(doc, DATA, [], 'item'), [])
})
