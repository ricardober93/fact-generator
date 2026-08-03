import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { createSignedInHarness, type ISignedInHarness } from '../auth/__fixtures__/signedIn'
import { InvoiceController } from './InvoiceController'
import { InvoiceRepository } from './models/invoice/InvoiceRepository'
import type { IInvoiceRecord } from './models/invoice/Invoice'
import { TemplateRepository } from './models/template/TemplateRepository'
import { findTemplatePreset } from './templates/presets'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

const DATA: IInvoiceRecord = {
  emisor: { nombre: 'Acme S.L.' },
  cliente: { nombre: 'Ana Pérez' },
  factura: { numero: 'F-2026-020', total: 145, fecha: '2026-08-01' },
}

const ITEMS: IInvoiceRecord[] = [{ descripcion: 'Producto uno', total: 70 }]

let harness: ISignedInHarness
let templateId = ''

before(async () => {
  harness = await createSignedInHarness([InvoiceController])
  const doc = findTemplatePreset('chevron-slate')!.build()
  const template = await container.resolve(TemplateRepository).createTemplate('Chevron', doc)
  templateId = template.id
})

after(async () => {
  await harness.close()
})

function invoices(): InvoiceRepository {
  return container.resolve(InvoiceRepository)
}

test('with no invoices the list says so and offers the first one', async () => {
  const page = await harness.get('/invoices')

  assert.equal(page.status, 200)
  assert.match(page.text, /Todavía no hay facturas/)
  assert.match(page.text, /\/invoices\/new/)
})

test('the new invoice page shows a form derived from the schema and a viewer', async () => {
  const page = await harness.get('/invoices/new')

  assert.equal(page.status, 200)
  assert.match(page.text, /data-field="cliente\.nombre"/)
  assert.match(page.text, /data-field="factura\.numero"/)
  assert.match(page.text, /data-invoice-paper="true"/)
  assert.equal(page.text.includes('data-field="item.descripcion"'), false)
})

test('saving creates the invoice and reports no duplicate', async () => {
  const result = await harness.action('/invoices/_action/save', {
    templateId,
    data: DATA,
    items: ITEMS,
  })
  const body = await result.json()

  assert.equal(body.duplicate, false)
  const stored = await invoices().find(body.id)
  assert.deepEqual(stored?.invoiceData, DATA)
})

test('a second invoice with the same number saves and warns', async () => {
  const result = await harness.action('/invoices/_action/save', {
    templateId,
    data: DATA,
    items: ITEMS,
  })
  const body = await result.json()

  assert.equal(body.duplicate, true)
  assert.ok(await invoices().find(body.id))
})

test('saving reports the revision it landed on', async () => {
  const created = await (
    await harness.action('/invoices/_action/save', { templateId, data: DATA, items: ITEMS })
  ).json()

  assert.equal(created.status, 'saved')
  assert.equal(created.rev, 1)

  const again = await (
    await harness.action('/invoices/_action/save', {
      id: created.id,
      templateId,
      data: DATA,
      items: ITEMS,
      rev: created.rev,
    })
  ).json()

  assert.equal(again.status, 'saved')
  assert.equal(again.rev, 2)
})

test('saving from a stale revision reports a conflict and changes nothing', async () => {
  const created = await (
    await harness.action('/invoices/_action/save', { templateId, data: DATA, items: ITEMS })
  ).json()
  await harness.action('/invoices/_action/save', {
    id: created.id,
    templateId,
    data: DATA,
    items: ITEMS,
    rev: created.rev,
  })

  const late = await (
    await harness.action('/invoices/_action/save', {
      id: created.id,
      templateId,
      data: { ...DATA, cliente: { nombre: 'NO DEBE GUARDARSE' } },
      items: ITEMS,
      rev: created.rev,
    })
  ).json()

  assert.equal(late.status, 'conflict')
  assert.equal(late.rev, 2)
  const stored = await invoices().find(created.id)
  assert.notEqual(
    (stored!.invoiceData.cliente as Record<string, unknown>).nombre,
    'NO DEBE GUARDARSE',
  )
})

test('a conflict is told apart without reading any message', async () => {
  const created = await (
    await harness.action('/invoices/_action/save', { templateId, data: DATA, items: ITEMS })
  ).json()

  const late = await harness.action('/invoices/_action/save', {
    id: created.id,
    templateId,
    data: DATA,
    items: ITEMS,
    rev: 999,
  })
  const body = await late.json()

  assert.equal(late.status, 200)
  assert.equal(body.status, 'conflict')
  assert.equal(body.duplicate, false)
})

test('the list shows number, customer, date and total', async () => {
  const page = await harness.get('/invoices')

  assert.match(page.text, /F-2026-020/)
  assert.match(page.text, /Ana Pérez/)
  assert.match(page.text, /2026-08-01/)
  assert.doesNotMatch(page.text, /Todavía no hay facturas/)
})

test('an invoice whose data no longer fits its design opens and says what drifted', async () => {
  const doc = findTemplatePreset('chevron-slate')!.build()
  doc.dataSchema = [...doc.dataSchema, { path: 'cliente.nif', type: 'string', required: false }]
  const template = await container.resolve(TemplateRepository).createTemplate('Con NIF', doc)
  const invoice = await invoices().createInvoice({
    templateId: template.id,
    data: { ...DATA, cliente: { nombre: 'Ana', apodo: 'Anita' } },
    items: ITEMS,
  })

  const page = await harness.get(`/invoices/${invoice.id}`)

  assert.equal(page.status, 200)
  assert.match(page.text, /data-mismatch="1"/)
  assert.ok(page.text.includes('cliente.apodo'))
})

test('an invoice that fits shows no mismatch notice', async () => {
  const invoice = await invoices().createInvoice({ templateId, data: DATA, items: ITEMS })

  const page = await harness.get(`/invoices/${invoice.id}`)

  assert.equal(page.text.includes('data-mismatch'), false)
})

test('the invoice pages never offer a PDF route', async () => {
  const page = await harness.get('/invoices/new')

  assert.equal(page.text.includes('.pdf'), false)
  assert.equal(page.text.toLowerCase().includes('descargar pdf'), false)
  assert.equal((await harness.get('/invoices/new.pdf')).status >= 400, true)
})

test('the page hides the form and the toolbar when printing', async () => {
  const page = await harness.get('/invoices/new')

  assert.match(page.text, /@media print/)
  assert.match(page.text, /\.wb-invoice-form\s*\{[^}]*display:\s*none/)
})

test('an unknown invoice is a 404', async () => {
  assert.equal((await harness.get('/invoices/no-existe')).status, 404)
})
