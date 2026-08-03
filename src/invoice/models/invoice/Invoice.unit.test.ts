import assert from 'node:assert/strict'
import test from 'node:test'
import { Invoice, type IInvoiceRecord } from './Invoice'

const DATA: IInvoiceRecord = { factura: { numero: 'A-1', total: 100 } }
const ITEMS: IInvoiceRecord[] = [{ descripcion: 'Uno', total: 100 }]

function invoiceWith(rev?: number): Invoice {
  return new Invoice({ templateId: 't1', data: DATA, items: ITEMS, params: {}, rev })
}

test('an invoice stored before the counter existed reads as revision zero', () => {
  assert.equal(invoiceWith(undefined).rev, 0)
})

test('a stored revision is read as it is', () => {
  assert.equal(invoiceWith(4).rev, 4)
})

test('applying a revision raises the counter by one and keeps the new data', () => {
  const invoice = invoiceWith(4)

  invoice.applyRevision({
    templateId: 't2',
    data: { factura: { numero: 'A-2', total: 200 } },
    items: [],
    params: { color: 'rojo' },
  })

  assert.equal(invoice.rev, 5)
  assert.equal(invoice.templateId, 't2')
  assert.equal(invoice.numero, 'A-2')
  assert.deepEqual(invoice.invoiceItems, [])
  assert.deepEqual(invoice.params, { color: 'rojo' })
})

test('the first revision of an invoice without a counter lands on one', () => {
  const invoice = invoiceWith(undefined)

  invoice.applyRevision({ templateId: 't1', data: DATA, items: ITEMS, params: {} })

  assert.equal(invoice.rev, 1)
})

test('applying changes without a revision leaves the counter alone', () => {
  const invoice = invoiceWith(4)

  invoice.applyChanges({ templateId: 't1', data: DATA, items: ITEMS, params: {} })

  assert.equal(invoice.rev, 4)
})
