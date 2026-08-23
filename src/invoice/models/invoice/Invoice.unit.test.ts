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

test('a document stored before the state existed reads as a draft invoice', () => {
  const invoice = invoiceWith(undefined)

  assert.equal(invoice.status, 'borrador')
  assert.equal(invoice.docType, 'factura')
  assert.equal(invoice.issued, false)
  assert.equal(invoice.number, null)
  assert.equal(invoice.issuedAt, null)
  assert.equal(invoice.prefix, '')
})

test('issuing stamps the five fields the system decides', () => {
  const invoice = invoiceWith(1)
  const at = Date.UTC(2026, 7, 22, 10, 30)

  invoice.applyIssue({
    prefix: 'FE',
    number: 1247,
    issuedAt: at,
    issuer: {},
    issuedBy: { userId: '', name: '' },
  })

  assert.equal(invoice.status, 'emitida')
  assert.equal(invoice.issued, true)
  assert.equal(invoice.prefix, 'FE')
  assert.equal(invoice.number, 1247)
  assert.equal(invoice.issuedAt?.getTime(), at)
})

test('the issued number overwrites the one somebody had typed', () => {
  const invoice = invoiceWith(1)

  assert.equal(invoice.numero, 'A-1')

  invoice.applyIssue({
    prefix: 'FE',
    number: 1247,
    issuedAt: Date.now(),
    issuer: {},
    issuedBy: { userId: '', name: '' },
  })

  assert.equal(invoice.numero, 'FE1247')
  assert.equal((invoice.invoiceData.factura as IInvoiceRecord).numero, 'FE1247')
})

test('issuing writes the number without losing its neighbours in the record', () => {
  const invoice = invoiceWith(1)

  invoice.applyIssue({
    prefix: 'FE',
    number: 7,
    issuedAt: Date.now(),
    issuer: {},
    issuedBy: { userId: '', name: '' },
  })

  assert.equal((invoice.invoiceData.factura as IInvoiceRecord).total, 100)
})

test('issuing a document with an empty prefix keeps the bare consecutive', () => {
  const invoice = invoiceWith(1)

  invoice.applyIssue({
    prefix: '',
    number: 42,
    issuedAt: Date.now(),
    issuer: {},
    issuedBy: { userId: '', name: '' },
  })

  assert.equal(invoice.numero, '42')
})

test('issuing refuses a number that is not a whole consecutive', () => {
  const invoice = invoiceWith(1)

  assert.throws(() =>
    invoice.applyIssue({
      prefix: 'FE',
      number: 1.5,
      issuedAt: Date.now(),
      issuer: {},
      issuedBy: { userId: '', name: '' },
    }),
  )
})
