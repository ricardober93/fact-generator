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
  const template = await container
    .resolve(TemplateRepository)
    .createTemplate('Diseño', doc, companyId)
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
  return invoices().createInvoice({ templateId, companyId, data, items })
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

test('a number ahead of the pointer drags the pointer past it', async () => {
  const range = await seedRange('F', 1000, 1999)
  const invoice = await draft()

  const issued = issuedBy(
    await issuance().issueInvoice(invoice.id, { prefix: 'F', number: 1500, at: AT }),
  )

  assert.equal(issued.number, 1500)
  assert.equal(await pointerOf(range.id), 1501)
})

test('a gap behind the pointer is filled without moving it', async () => {
  const range = await seedRange('G', 1000, 1999)
  const first = await draft()
  await issuance().issueInvoice(first.id, { prefix: 'G', number: 1200, at: AT })

  const second = await draft()
  const issued = issuedBy(
    await issuance().issueInvoice(second.id, { prefix: 'G', number: 1100, at: AT }),
  )

  assert.equal(issued.number, 1100)
  assert.equal(await pointerOf(range.id), 1201)
})

test('a number another document already carries is refused', async () => {
  await seedRange('H', 1, 99)
  const first = await draft()
  await issuance().issueInvoice(first.id, { prefix: 'H', number: 5, at: AT })

  const second = await draft()
  const result = await issuance().issueInvoice(second.id, { prefix: 'H', number: 5, at: AT })

  assert.equal(refusalOf(result), 'NUMBER_ALREADY_USED')
  assert.equal((await invoices().findOrThrow(second.id)).status, 'borrador')
})

test('a number outside every range is refused', async () => {
  await seedRange('I', 1, 99)
  const invoice = await draft()

  const result = await issuance().issueInvoice(invoice.id, { prefix: 'I', number: 5000, at: AT })

  assert.equal(refusalOf(result), 'NUMBER_OUT_OF_RANGE')
})

test('an exhausted range says so, and a valid one takes over', async () => {
  const spent = await seedRange('J', 1, 2)
  const first = await draft()
  const second = await draft()
  await issuance().issueInvoice(first.id, { prefix: 'J', at: AT })
  await issuance().issueInvoice(second.id, { prefix: 'J', at: AT })
  assert.equal((await ranges().findOrThrow(spent.id)).exhausted, true)

  const third = await draft()
  const refused = await issuance().issueInvoice(third.id, { prefix: 'J', number: 3, at: AT })
  assert.equal(refusalOf(refused), 'NUMBER_OUT_OF_RANGE')
  assert.equal(
    refusalOf(await issuance().issueInvoice(third.id, { prefix: 'J', at: AT })),
    'RANGE_EXHAUSTED',
  )

  await seedRange('J', 3, 4)
  const accepted = issuedBy(await issuance().issueInvoice(third.id, { prefix: 'J', at: AT }))
  assert.equal(accepted.number, 3)
})

test('a range outside its validity does not issue', async () => {
  await seedRange('K', 1, 99, Date.UTC(2026, 5, 30))
  const invoice = await draft()

  const result = await issuance().issueInvoice(invoice.id, { prefix: 'K', at: AT })

  assert.equal(refusalOf(result), 'RANGE_EXPIRED')
})

test('without any range for its document type there is nothing to issue against', async () => {
  await seedRange('M', 1, 99)
  const invoice = issuedBy(
    await issuance().issueInvoice((await draft()).id, { prefix: 'M', at: AT }),
  )
  const note = await issuance().createCreditNoteFor(invoice.id)
  const ready = await invoices().saveInvoice(
    note.id,
    {
      templateId,
      companyId,
      data: note.invoiceData,
      items: note.invoiceItems,
      correctionReason: 'Anulación total',
    },
    note.rev,
  )

  const result = await issuance().issueInvoice(ready.invoice.id, { at: AT })

  assert.equal(refusalOf(result), 'NO_NUMBER_RANGE')
})
