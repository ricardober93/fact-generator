import assert from 'node:assert/strict'
import test, { before } from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { CompanyRepository } from '../company/app'
import { ACME, seedCompany } from '../company/__fixtures__/seededCompany'
import { NumberRangeRepository } from '../numbering/app'
import { Issuance } from './Issuance'
import type { IInvoiceRecord } from './models/invoice/Invoice'
import { InvoiceRepository } from './models/invoice/InvoiceRepository'
import { TemplateRepository } from './models/template/TemplateRepository'
import { findTemplatePreset } from './templates/presets'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

const DATA: IInvoiceRecord = {
  cliente: { nombre: 'Ana Pérez' },
  factura: { numero: 'TECLEADO', total: 70, fecha: '2026-08-01' },
}

const ITEMS: IInvoiceRecord[] = [{ descripcion: 'Producto uno', total: 70 }]

let templateId = ''
let companyId = ''

function invoices(): InvoiceRepository {
  return container.resolve(InvoiceRepository)
}

function issuance(): Issuance {
  return container.resolve(Issuance)
}

function issuerOf(data: IInvoiceRecord): IInvoiceRecord {
  return data.emisor as IInvoiceRecord
}

before(async () => {
  companyId = await seedCompany()
  const doc = findTemplatePreset('chevron-slate')!.build()
  templateId = (await container.resolve(TemplateRepository).createTemplate('Diseño', doc)).id
  await container.resolve(NumberRangeRepository).createRange({
    owner: companyId,
    series: 'factura',
    prefix: 'FE',
    from: 1,
    to: 999,
    validFrom: Date.UTC(2020, 0, 1),
    validTo: Date.UTC(2099, 11, 31),
  })
})

test('a draft takes its issuer from the company, not from a keyboard', async () => {
  const draft = await invoices().createInvoice({ templateId, data: DATA, items: ITEMS })

  assert.equal(issuerOf(draft.invoiceData).nombre, ACME.name)
  assert.equal(issuerOf(draft.invoiceData).nit, ACME.nit)
})

test('an issuer typed by hand is overwritten by the company', async () => {
  const draft = await invoices().createInvoice({
    templateId,
    data: { ...DATA, emisor: { nombre: 'Lo que sea', nit: '000' } },
    items: ITEMS,
  })

  assert.equal(issuerOf(draft.invoiceData).nombre, ACME.name)
})

test('changing the company reaches drafts and never an issued document', async () => {
  const draft = await invoices().createInvoice({ templateId, data: DATA, items: ITEMS })
  const issued = await issuance().issueInvoice(draft.id)
  assert.equal(issued.status, 'issued')

  await container.resolve(CompanyRepository).saveCompany(companyId, { ...ACME, name: 'Acme S.A.' })

  const stored = await invoices().findOrThrow(draft.id)
  assert.equal(issuerOf(stored.invoiceData).nombre, ACME.name)
  assert.equal(stored.issuer.nombre, ACME.name)

  const later = await invoices().createInvoice({ templateId, data: DATA, items: ITEMS })
  assert.equal(issuerOf(later.invoiceData).nombre, 'Acme S.A.')
})

test('issuing freezes who issued it', async () => {
  const draft = await invoices().createInvoice({ templateId, data: DATA, items: ITEMS })

  const result = await issuance().issueInvoice(draft.id)

  assert.equal(result.status, 'issued')
  assert.equal(result.status === 'issued' && result.invoice.issuer.nit, ACME.nit)
  assert.equal(result.status === 'issued' && result.invoice.companyId, companyId)
})
