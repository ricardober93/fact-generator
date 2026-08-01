import assert from 'node:assert/strict'
import test from 'node:test'
import { emptyDocument, type IDataPath, type IDocument } from './document'
import { render } from './render'
import { sampleDataFor } from './sampleData'
import { invoiceDocumentFixture } from './__fixtures__/invoiceDocument'
import { renderToHtml } from './__fixtures__/renderToHtml'

function docWith(dataSchema: IDataPath[]): IDocument {
  const doc = emptyDocument()
  doc.dataSchema = dataSchema
  return doc
}

test('each declared type gets a value of that type', () => {
  const { data } = sampleDataFor(
    docWith([
      { path: 'a', type: 'string', required: true },
      { path: 'b', type: 'number', required: true },
      { path: 'c', type: 'boolean', required: true },
      { path: 'd', type: 'date', required: true },
    ]),
  )

  assert.equal(typeof data.a, 'string')
  assert.equal(typeof data.b, 'number')
  assert.equal(typeof data.c, 'boolean')
  assert.equal(typeof data.d, 'string')
  assert.match(String(data.d), /^\d{4}-\d{2}-\d{2}$/)
})

test('a date sample is a primitive so bindings can resolve it', () => {
  const { data } = sampleDataFor(docWith([{ path: 'emitida', type: 'date', required: true }]))

  assert.notEqual(typeof data.emitida, 'object')
  assert.equal(Number.isNaN(new Date(String(data.emitida)).getTime()), false)
})

test('nested paths become nested objects, not dotted keys', () => {
  const { data } = sampleDataFor(
    docWith([
      { path: 'cliente.nombre', type: 'string', required: true },
      { path: 'cliente.nif', type: 'string', required: false },
    ]),
  )

  assert.deepEqual(Object.keys(data), ['cliente'])
  const cliente = data.cliente as Record<string, unknown>
  assert.equal(typeof cliente.nombre, 'string')
  assert.equal(typeof cliente.nif, 'string')
  assert.equal('cliente.nombre' in data, false)
})

test('item paths land in the item, not in the data', () => {
  const { data, item } = sampleDataFor(
    docWith([
      { path: 'factura.numero', type: 'string', required: true },
      { path: 'item.descripcion', type: 'string', required: true },
      { path: 'item.total', type: 'number', required: true },
    ]),
  )

  assert.deepEqual(Object.keys(data), ['factura'])
  assert.equal(typeof item.descripcion, 'string')
  assert.equal(typeof item.total, 'number')
  assert.equal('item' in data, false)
})

test('an empty schema gives empty structures without failing', () => {
  const { data, item } = sampleDataFor(emptyDocument())

  assert.deepEqual(data, {})
  assert.deepEqual(item, {})
})

test('a document without a dataSchema is rejected', () => {
  assert.throws(() => sampleDataFor({} as IDocument), /dataSchema/)
})

test('the sample satisfies every required path of a real document', async () => {
  const doc = invoiceDocumentFixture()
  const { data, item } = sampleDataFor(doc)

  const html = await renderToHtml(render({ doc, data, items: [item] }))

  assert.ok(html.length > 0)
  assert.ok(html.includes('Texto'))
})

test('sampling does not mutate the document', () => {
  const doc = invoiceDocumentFixture()
  const snapshot = JSON.stringify(doc)

  sampleDataFor(doc)

  assert.equal(JSON.stringify(doc), snapshot)
})
