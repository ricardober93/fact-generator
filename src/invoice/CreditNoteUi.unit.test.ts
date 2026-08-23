import assert from 'node:assert/strict'
import { seedCompany } from '../company/__fixtures__/seededCompany'
import { Issuance } from './Issuance'
import test, { after, before } from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { createSignedInHarness, type ISignedInHarness } from '../auth/__fixtures__/signedIn'
import { InvoiceController } from './InvoiceController'
import type { Invoice, IInvoiceRecord } from './models/invoice/Invoice'
import { InvoiceRepository } from './models/invoice/InvoiceRepository'
import { NumberRangeRepository } from '../numbering/app'
import { TemplateRepository } from './models/template/TemplateRepository'
import { findTemplatePreset } from './templates/presets'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

const DATA: IInvoiceRecord = {
  emisor: { nombre: 'Acme S.L.' },
  cliente: { nombre: 'Ana Pérez' },
  factura: { numero: 'TECLEADO', total: 70, fecha: '2026-08-01' },
}

const ITEMS: IInvoiceRecord[] = [{ descripcion: 'Producto uno', total: 70 }]

let harness: ISignedInHarness
let templateId = ''
let companyId = ''

function issuance(): Issuance {
  return container.resolve(Issuance)
}

function invoices(): InvoiceRepository {
  return container.resolve(InvoiceRepository)
}

before(async () => {
  companyId = await seedCompany()
  harness = await createSignedInHarness([InvoiceController])
  const doc = findTemplatePreset('chevron-slate')!.build()
  templateId = (
    await container.resolve(TemplateRepository).createTemplate('Diseño', doc, companyId)
  ).id
  const ranges = container.resolve(NumberRangeRepository)
  for (const series of ['factura', 'notaCredito'] as const) {
    await ranges.createRange({
      owner: companyId,
      series,
      prefix: series === 'factura' ? 'FE' : 'NC',
      from: 1,
      to: 999,
      validFrom: Date.UTC(2020, 0, 1),
      validTo: Date.UTC(2099, 11, 31),
    })
  }
})

after(async () => await harness.close())

async function draft(): Promise<Invoice> {
  return invoices().createInvoice({ templateId, companyId, data: DATA, items: ITEMS })
}

async function issued(): Promise<Invoice> {
  const invoice = await draft()
  const result = await issuance().issueInvoice(invoice.id)
  if (result.status !== 'issued') throw new Error(`expected issued, got ${result.reason}`)
  return result.invoice
}

test('correcting an issued invoice creates the note and lands on it', async () => {
  const invoice = await issued()

  const response = await harness.action(
    '/invoices/_action/correct',
    { id: invoice.id },
    { redirect: 'manual' },
  )

  const notes = (await invoices().findAll()).filter((one) => one.corrects?.id === invoice.id)
  assert.equal(notes.length, 1)
  assert.equal(notes[0]?.docType, 'notaCredito')
  assert.deepEqual(notes[0]?.invoiceItems, ITEMS)
  assert.match(String(response.headers.get('location') ?? ''), new RegExp(`${notes[0]?.id}`))
})

test('a draft cannot be corrected, and nothing is created', async () => {
  const pending = await draft()
  const before = (await invoices().findAll()).length

  await harness.action('/invoices/_action/correct', { id: pending.id }, { redirect: 'manual' })

  assert.equal((await invoices().findAll()).length, before)
})

test('correcting leaves the corrected invoice untouched', async () => {
  const invoice = await issued()
  const frozen = invoice.invoiceData

  await harness.action('/invoices/_action/correct', { id: invoice.id }, { redirect: 'manual' })

  const stored = await invoices().findOrThrow(invoice.id)
  assert.deepEqual(stored.invoiceData, frozen)
  assert.equal(stored.status, 'emitida')
  assert.equal(stored.docType, 'factura')
})

test('only an issued invoice offers to be corrected', async () => {
  const pending = await draft()
  const sent = await issued()
  const note = await issuance().createCreditNoteFor(sent.id)

  const asDraft = await harness.get(`/invoices/${pending.id}`)
  const asIssued = await harness.get(`/invoices/${sent.id}`)
  const asNote = await harness.get(`/invoices/${note.id}`)

  assert.equal(asDraft.text.includes('data-action="correct"'), false)
  assert.match(asIssued.text, /data-action="correct"/)
  assert.equal(asNote.text.includes('data-action="correct"'), false)
})

test('a credit note asks for its reason and an invoice does not', async () => {
  const invoice = await issued()
  const note = await issuance().createCreditNoteFor(invoice.id)

  const notePage = await harness.get(`/invoices/${note.id}`)
  const invoicePage = await harness.get(`/invoices/${invoice.id}`)

  assert.match(notePage.text, /data-correction-reason="true"/)
  assert.match(notePage.text, /Motivo \(obligatorio\)/)
  assert.equal(invoicePage.text.includes('data-correction-reason="true"'), false)
})

test('the reason is saved with the draft and comes back', async () => {
  const invoice = await issued()
  const note = await issuance().createCreditNoteFor(invoice.id)

  await harness.action('/invoices/_action/save', {
    id: note.id,
    rev: note.rev,
    templateId,
    data: note.invoiceData,
    items: note.invoiceItems,
    correctionReason: 'Devolución total',
  })

  assert.equal((await invoices().findOrThrow(note.id)).correctionReason, 'Devolución total')
  assert.match((await harness.get(`/invoices/${note.id}`)).text, /Devolución total/)
})

test('a credit note says and links which invoice it corrects', async () => {
  const invoice = await issued()
  const note = await issuance().createCreditNoteFor(invoice.id)

  const notePage = await harness.get(`/invoices/${note.id}`)
  const invoicePage = await harness.get(`/invoices/${invoice.id}`)

  assert.match(notePage.text, new RegExp(`data-corrects="${invoice.id}"`))
  assert.match(notePage.text, new RegExp(`/invoices/${invoice.id}`))
  assert.match(notePage.text, new RegExp(`${invoice.prefix}${invoice.number}`))
  assert.equal(invoicePage.text.includes('data-corrects='), false)
})

test('the list marks an invoice that an issued credit note corrects', async () => {
  const corrected = await issued()
  const untouched = await issued()
  const note = await issuance().createCreditNoteFor(corrected.id)
  await invoices().saveInvoice(
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
  await issuance().issueInvoice(note.id)

  const page = await harness.get('/invoices')
  const rowOf = (id: string) => page.text.slice(page.text.indexOf(`data-invoice="${id}"`))

  assert.match(rowOf(corrected.id).slice(0, 400), /data-corrected="true"/)
  assert.equal(rowOf(untouched.id).slice(0, 400).includes('data-corrected="true"'), false)
})
