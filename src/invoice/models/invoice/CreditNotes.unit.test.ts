import assert from 'node:assert/strict'
import test from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { findTemplatePreset } from '../../templates/presets'
import { NumberRangeRepository } from '../../../numbering/app'
import { TemplateRepository } from '../template/TemplateRepository'
import { InvoiceRepository, type IIssueInvoiceResult } from './InvoiceRepository'
import type { Invoice, IInvoiceRecord } from './Invoice'

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

const ITEMS: IInvoiceRecord[] = [
  { descripcion: 'Producto uno', total: 40 },
  { descripcion: 'Producto dos', total: 30 },
]

function invoices(): InvoiceRepository {
  return container.resolve(InvoiceRepository)
}

function ranges(): NumberRangeRepository {
  return container.resolve(NumberRangeRepository)
}

let templateId = ''

test.before(async () => {
  const doc = findTemplatePreset('chevron-slate')!.build()
  const template = await container.resolve(TemplateRepository).createTemplate('Diseño', doc)
  templateId = template.id
  await ranges().createRange({
    series: 'factura',
    prefix: 'FE',
    from: 1,
    to: 999,
    validFrom: VALID_FROM,
    validTo: VALID_TO,
  })
})

function issuedBy(result: IIssueInvoiceResult): Invoice {
  if (result.status !== 'issued') throw new Error(`expected issued, got ${result.reason}`)
  return result.invoice
}

function refusalOf(result: IIssueInvoiceResult): string {
  if (result.status !== 'rejected') throw new Error('expected a refusal')
  return result.reason
}

async function issuedInvoice(): Promise<Invoice> {
  const draft = await invoices().createInvoice({ templateId, data: DATA, items: ITEMS })
  return issuedBy(await invoices().issueInvoice(draft.id, { prefix: 'FE', at: AT }))
}

async function withReason(note: Invoice, reason: string): Promise<Invoice> {
  const saved = await invoices().saveInvoice(
    note.id,
    {
      templateId: note.templateId,
      data: note.invoiceData,
      items: note.invoiceItems,
      correctionReason: reason,
    },
    note.rev,
  )
  return saved.invoice
}

test('a credit note starts from the invoice it corrects', async () => {
  const invoice = await issuedInvoice()

  const note = await invoices().createCreditNoteFor(invoice.id)

  assert.equal(note.docType, 'notaCredito')
  assert.equal(note.status, 'borrador')
  assert.deepEqual(note.invoiceItems, ITEMS)
  assert.deepEqual(note.corrects, { id: invoice.id, prefix: 'FE', number: invoice.number })
})

test('a draft cannot be corrected, only an issued document', async () => {
  const draft = await invoices().createInvoice({ templateId, data: DATA, items: ITEMS })

  await assert.rejects(() => invoices().createCreditNoteFor(draft.id))
})

test('without a reason a credit note is not issued', async () => {
  const invoice = await issuedInvoice()
  const note = await invoices().createCreditNoteFor(invoice.id)
  await ranges().createRange({
    series: 'notaCredito',
    prefix: 'NC',
    from: 1,
    to: 99,
    validFrom: VALID_FROM,
    validTo: VALID_TO,
  })

  const result = await invoices().issueInvoice(note.id, { prefix: 'NC', at: AT })

  assert.equal(refusalOf(result), 'MISSING_REASON')
  assert.equal((await invoices().findOrThrow(note.id)).status, 'borrador')
})

test('a credit note takes its own consecutive and leaves the invoice range alone', async () => {
  const invoice = await issuedInvoice()
  const note = await withReason(await invoices().createCreditNoteFor(invoice.id), 'Anulación total')
  const invoicePointer = (await ranges().findBySeries('factura'))[0]?.next

  const issued = issuedBy(await invoices().issueInvoice(note.id, { prefix: 'NC', at: AT }))

  assert.equal(issued.prefix, 'NC')
  assert.equal((await ranges().findBySeries('factura'))[0]?.next, invoicePointer)
})

test('issuing a credit note leaves the corrected invoice untouched', async () => {
  const invoice = await issuedInvoice()
  const before = {
    data: invoice.invoiceData,
    status: invoice.status,
    number: invoice.number,
  }
  const note = await withReason(await invoices().createCreditNoteFor(invoice.id), 'Devolución')

  await invoices().issueInvoice(note.id, { prefix: 'NC', at: AT })

  const stored = await invoices().findOrThrow(invoice.id)
  assert.deepEqual(stored.invoiceData, before.data)
  assert.equal(stored.status, before.status)
  assert.equal(stored.number, before.number)
})

test('the credit note prints its own number, not the one it copied', async () => {
  const invoice = await issuedInvoice()
  const note = await withReason(await invoices().createCreditNoteFor(invoice.id), 'Rebaja')

  const issued = issuedBy(await invoices().issueInvoice(note.id, { prefix: 'NC', at: AT }))

  assert.equal(issued.numero, `NC${issued.number}`)
  assert.equal((issued.invoiceData.factura as IInvoiceRecord).numero, `NC${issued.number}`)
  assert.notEqual(issued.number, invoice.number)
})

test('a partial correction keeps the reference after trimming lines', async () => {
  const invoice = await issuedInvoice()
  const note = await invoices().createCreditNoteFor(invoice.id)

  const saved = await invoices().saveInvoice(
    note.id,
    {
      templateId,
      data: { ...DATA, factura: { numero: 'X', total: 40, fecha: '2026-08-01' } },
      items: [ITEMS[0] as IInvoiceRecord],
      correctionReason: 'Devolución parcial',
    },
    note.rev,
  )

  assert.equal(saved.invoice.invoiceItems.length, 1)
  assert.deepEqual(saved.invoice.corrects, { id: invoice.id, prefix: 'FE', number: invoice.number })
})

test('an issued document is never deleted, a draft is', async () => {
  const invoice = await issuedInvoice()
  const draft = await invoices().createInvoice({ templateId, data: DATA, items: ITEMS })

  await assert.rejects(() => invoices().deleteDraft(invoice))
  await invoices().deleteDraft(draft)

  assert.ok(await invoices().find(invoice.id))
  assert.equal(await invoices().find(draft.id), null)
})
