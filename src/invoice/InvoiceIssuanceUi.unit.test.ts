import assert from 'node:assert/strict'
import { Issuance } from './Issuance'
import test, { after, before } from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { createSignedInHarness, type ISignedInHarness } from '../auth/__fixtures__/signedIn'
import { InvoiceController } from './InvoiceController'
import { NumberRangeController } from '../numbering/app'
import type { IInvoiceRecord } from './models/invoice/Invoice'
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

function issuance(): Issuance {
  return container.resolve(Issuance)
}

function invoices(): InvoiceRepository {
  return container.resolve(InvoiceRepository)
}

before(async () => {
  harness = await createSignedInHarness([InvoiceController, NumberRangeController])
  const doc = findTemplatePreset('chevron-slate')!.build()
  templateId = (await container.resolve(TemplateRepository).createTemplate('Diseño', doc)).id
  await container.resolve(NumberRangeRepository).createRange({
    series: 'factura',
    prefix: 'FE',
    from: 1,
    to: 999,
    validFrom: Date.UTC(2020, 0, 1),
    validTo: Date.UTC(2099, 11, 31),
  })
})

after(async () => await harness.close())

async function draft() {
  return invoices().createInvoice({ templateId, data: DATA, items: ITEMS })
}

test('a draft offers issuing, and saving', async () => {
  const invoice = await draft()

  const page = await harness.get(`/invoices/${invoice.id}`)

  assert.match(page.text, /data-action="issue"/)
  assert.match(page.text, /data-action="save"/)
  assert.equal(page.text.includes('<fieldset class="wb-invoice-fieldset" disabled'), false)
})

test('the issue action reports the number it landed on', async () => {
  const invoice = await draft()

  const result = await harness.action('/invoices/_action/issue', { id: invoice.id })
  const body = await result.json()

  assert.equal(body.status, 'issued')
  assert.match(body.numero, /^FE\d+$/)
  assert.equal((await invoices().findOrThrow(invoice.id)).issued, true)
})

test('the issue action reports a refusal as a value, not as a failure', async () => {
  const invoice = await invoices().createInvoice({
    templateId,
    data: { ...DATA, factura: { numero: 'X', base: 100, impuestos: 19, total: 999 } },
    items: ITEMS,
  })

  const result = await harness.action('/invoices/_action/issue', { id: invoice.id })
  const body = await result.json()

  assert.equal(result.status, 200)
  assert.equal(body.status, 'rejected')
  assert.equal(body.reason, 'ARITHMETIC_MISMATCH')
  assert.ok(body.issues.length > 0)
})

test('an issued document is shown but not edited', async () => {
  const invoice = await draft()
  await issuance().issueInvoice(invoice.id)

  const page = await harness.get(`/invoices/${invoice.id}`)

  assert.match(page.text, /<fieldset class="wb-invoice-fieldset" disabled/)
  assert.equal(page.text.includes('data-action="save"'), false)
  assert.equal(page.text.includes('data-action="issue"'), false)
  assert.match(page.text, /data-issued="true"/)
})

test('the list tells a draft from an issued document', async () => {
  const pending = await draft()
  const sent = await draft()
  await issuance().issueInvoice(sent.id)

  const page = await harness.get('/invoices')

  assert.match(page.text, new RegExp(`data-invoice="${pending.id}" data-status="borrador"`))
  assert.match(page.text, new RegExp(`data-invoice="${sent.id}" data-status="emitida"`))
})

test('the numbering screen lists the ranges and creates one', async () => {
  const page = await harness.get('/ranges')
  assert.match(page.text, /Numeración/)
  assert.match(page.text, /data-range=/)

  const created = await harness.action(
    '/ranges/_action/create',
    {
      series: 'notaCredito',
      prefix: 'NC',
      from: '1',
      to: '99',
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
    },
    { redirect: 'manual' },
  )

  assert.ok(created.status >= 200)
  const stored = await container.resolve(NumberRangeRepository).findBySeries('notaCredito')
  assert.equal(stored.length, 1)
  assert.equal(stored[0]?.prefix, 'NC')
})

test('retouching the template reaches an issued document without touching its data', async () => {
  const invoice = await draft()
  await issuance().issueInvoice(invoice.id)
  const frozen = (await invoices().findOrThrow(invoice.id)).invoiceData

  const templates = container.resolve(TemplateRepository)
  const template = await templates.findOrThrow(templateId)
  await templates.saveDocument(
    templateId,
    { ...template.doc, theme: { ...template.doc.theme, primary: '#ff00aa' } },
    template.rev,
  )

  const page = await harness.get(`/invoices/${invoice.id}`)

  assert.match(page.text, /#ff00aa/)
  assert.deepEqual((await invoices().findOrThrow(invoice.id)).invoiceData, frozen)
  assert.equal((await invoices().findOrThrow(invoice.id)).issued, true)
})
