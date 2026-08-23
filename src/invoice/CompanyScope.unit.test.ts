import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { createSignedInHarness, sessionHeaders } from '../auth/__fixtures__/signedIn'
import type { ISignedInHarness } from '../auth/__fixtures__/signedIn'
import { CompanyRepository } from '../company/app'
import { InvoiceController } from './InvoiceController'
import type { IInvoiceRecord } from './models/invoice/Invoice'
import { InvoiceRepository } from './models/invoice/InvoiceRepository'
import { TemplateRepository } from './models/template/TemplateRepository'
import { findTemplatePreset } from './templates/presets'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

const DATA: IInvoiceRecord = {
  cliente: { nombre: 'Ana Pérez' },
  factura: { numero: 'X', total: 70, fecha: '2026-08-01' },
}

const ITEMS: IInvoiceRecord[] = [{ descripcion: 'Producto uno', total: 70 }]

let harness: ISignedInHarness
let acme = ''
let otra = ''
let acmeInvoiceId = ''
let otraInvoiceId = ''

function invoices(): InvoiceRepository {
  return container.resolve(InvoiceRepository)
}

async function seedFor(companyId: string): Promise<string> {
  const doc = findTemplatePreset('chevron-slate')!.build()
  const template = await container
    .resolve(TemplateRepository)
    .createTemplate(`Diseño ${companyId}`, doc, companyId)
  const invoice = await invoices().createInvoice({
    templateId: template.id,
    companyId,
    data: DATA,
    items: ITEMS,
  })
  return invoice.id
}

before(async () => {
  const companies = container.resolve(CompanyRepository)
  acme = (await companies.createCompany({ nit: '900-1', name: 'Acme' })).id
  otra = (await companies.createCompany({ nit: '900-2', name: 'Otra' })).id
  acmeInvoiceId = await seedFor(acme)
  otraInvoiceId = await seedFor(otra)
  harness = await createSignedInHarness([InvoiceController])
})

after(async () => await harness.close())

function as(companyId: string) {
  return { headers: sessionHeaders({ companyId }) }
}

test('the list only shows the documents of the active company', async () => {
  const page = await harness.get('/invoices', as(acme))

  assert.match(page.text, new RegExp(`data-invoice="${acmeInvoiceId}"`))
  assert.equal(page.text.includes(`data-invoice="${otraInvoiceId}"`), false)
})

test('switching company switches what the list shows', async () => {
  const page = await harness.get('/invoices', as(otra))

  assert.match(page.text, new RegExp(`data-invoice="${otraInvoiceId}"`))
  assert.equal(page.text.includes(`data-invoice="${acmeInvoiceId}"`), false)
})

test('a document of another company answers as if it did not exist', async () => {
  const page = await harness.get(`/invoices/${otraInvoiceId}`, as(acme))

  assert.equal(page.status, 404)
})

test('its own document does open', async () => {
  const page = await harness.get(`/invoices/${acmeInvoiceId}`, as(acme))

  assert.equal(page.status, 200)
})

test('both companies kept their own documents all along', async () => {
  assert.equal((await invoices().findAllFor(acme)).length, 1)
  assert.equal((await invoices().findAllFor(otra)).length, 1)
  assert.equal((await invoices().findAll()).length, 2)
})
