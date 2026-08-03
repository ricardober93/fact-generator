import assert from 'node:assert/strict'
import test, { before } from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { versionOfInvoice } from './InvoiceController'
import { InvoiceRepository } from './models/invoice/InvoiceRepository'
import { TemplateRepository } from './models/template/TemplateRepository'
import { invoiceDocumentFixture } from './render/__fixtures__/invoiceDocument'
import { INVOICE_DATA, INVOICE_ITEMS } from './render/__fixtures__/renderToHtml'
import type { IInvoiceRecord } from './models/invoice/Invoice'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

const DATA = INVOICE_DATA as unknown as IInvoiceRecord
const ITEMS = INVOICE_ITEMS as unknown as IInvoiceRecord[]

let invoiceId = ''
let templateId = ''

function invoices(): InvoiceRepository {
  return container.resolve(InvoiceRepository)
}

function templates(): TemplateRepository {
  return container.resolve(TemplateRepository)
}

before(async () => {
  const template = await templates().createTemplate('Base', invoiceDocumentFixture())
  templateId = template.id
  const invoice = await invoices().createInvoice({
    templateId,
    data: DATA,
    items: ITEMS,
  })
  invoiceId = invoice.id
})

test('an unchanged invoice keeps the same key', async () => {
  const first = await versionOfInvoice({ id: invoiceId })
  const second = await versionOfInvoice({ id: invoiceId })

  assert.equal(first, second)
})

test('saving different data changes the key', async () => {
  const before = await versionOfInvoice({ id: invoiceId })

  await invoices().saveInvoice(invoiceId, {
    templateId,
    data: { ...DATA, factura: { ...(DATA.factura as IInvoiceRecord), numero: 'A-999' } },
    items: ITEMS,
  })

  assert.notEqual(await versionOfInvoice({ id: invoiceId }), before)
})

test('editing the document of its template changes the key', async () => {
  const before = await versionOfInvoice({ id: invoiceId })
  const template = await templates().find(templateId)

  const edited = invoiceDocumentFixture()
  edited.theme = { ...edited.theme, primary: '#123456' }
  await templates().saveDocument(templateId, edited, template!.rev)

  assert.notEqual(await versionOfInvoice({ id: invoiceId }), before)
})

test('creating another template changes the key, because it joins the picker', async () => {
  const before = await versionOfInvoice({ id: invoiceId })

  await templates().createTemplate('Otra', invoiceDocumentFixture())

  assert.notEqual(await versionOfInvoice({ id: invoiceId }), before)
})

test('an invoice that does not exist still yields a key instead of throwing', async () => {
  const key = await versionOfInvoice({ id: 'no-existe' })

  assert.equal(typeof key, 'string')
  assert.ok(key.length > 0)
})
