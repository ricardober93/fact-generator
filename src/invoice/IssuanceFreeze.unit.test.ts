import assert from 'node:assert/strict'
import { seedCompany } from '../company/__fixtures__/seededCompany'
import { Issuance } from './Issuance'
import test from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { findTemplatePreset } from './templates/presets'
import { NumberRangeRepository } from '../numbering/app'
import { TemplateRepository } from './models/template/TemplateRepository'
import { InvoiceRepository } from './models/invoice/InvoiceRepository'
import type { IIssueInvoiceResult } from './Issuance'
import type { Invoice, IInvoiceRecord } from './models/invoice/Invoice'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

const AT = Date.UTC(2026, 7, 22, 10, 0)
const VALID_FROM = Date.UTC(2026, 0, 1)
const VALID_TO = Date.UTC(2026, 11, 31)

const DATA: IInvoiceRecord = {
  emisor: { nombre: 'Acme S.L.' },
  cliente: { nombre: 'Ana Pérez' },
  factura: { numero: 'TECLEADO', total: 70, fecha: '2026-08-01' },
}

const ITEMS: IInvoiceRecord[] = [{ descripcion: 'Producto uno', total: 70 }]

function issuance(): Issuance {
  return container.resolve(Issuance)
}

function invoices(): InvoiceRepository {
  return container.resolve(InvoiceRepository)
}

function ranges(): NumberRangeRepository {
  return container.resolve(NumberRangeRepository)
}

let templateId = ''
let companyId = ''

test.before(async () => {
  companyId = await seedCompany()
  const doc = findTemplatePreset('chevron-slate')!.build()
  const template = await container.resolve(TemplateRepository).createTemplate('Diseño', doc)
  templateId = template.id
})

async function seedRange(prefix: string, from: number, to: number, validTo = VALID_TO) {
  return ranges().createRange({
    owner: companyId,
    series: 'factura',
    prefix,
    from,
    to,
    validFrom: VALID_FROM,
    validTo,
  })
}

async function draft(data: IInvoiceRecord = DATA, items: IInvoiceRecord[] = ITEMS) {
  return invoices().createInvoice({ templateId, data, items })
}

function issuedBy(result: IIssueInvoiceResult): Invoice {
  if (result.status !== 'issued')
    throw new Error(`expected an issued document, got ${result.reason}`)
  return result.invoice
}

function refusalOf(result: IIssueInvoiceResult): string {
  if (result.status !== 'rejected') throw new Error('expected a refusal')
  return result.reason
}

async function pointerOf(rangeId: string): Promise<number> {
  return (await ranges().findOrThrow(rangeId)).next
}

test('saving over an issued document writes absolutely nothing', async () => {
  await seedRange('L', 1, 99)
  const invoice = await draft()
  const issued = issuedBy(await issuance().issueInvoice(invoice.id, { prefix: 'L', at: AT }))

  await assert.rejects(() =>
    invoices().saveInvoice(
      invoice.id,
      { templateId, data: { ...DATA, cliente: { nombre: 'Otro' } }, items: [] },
      issued.rev,
    ),
  )

  const stored = await invoices().findOrThrow(invoice.id)
  assert.deepEqual(stored.invoiceData, issued.invoiceData)
  assert.deepEqual(stored.invoiceItems, ITEMS)
  assert.equal(stored.rev, issued.rev)
})

test('a draft still saves exactly as it did before issuance existed', async () => {
  const invoice = await draft()

  const result = await invoices().saveInvoice(
    invoice.id,
    { templateId, data: { ...DATA, cliente: { nombre: 'Ana María' } }, items: ITEMS },
    invoice.rev,
  )

  assert.equal(result.status, 'saved')
  assert.equal(result.invoice.rev, invoice.rev + 1)
})
