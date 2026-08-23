import assert from 'node:assert/strict'
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

test.before(async () => {
  const doc = findTemplatePreset('chevron-slate')!.build()
  const template = await container.resolve(TemplateRepository).createTemplate('Diseño', doc)
  templateId = template.id
})

async function seedRange(prefix: string, from: number, to: number, validTo = VALID_TO) {
  return ranges().createRange({
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

test('issuing takes the next consecutive and moves the pointer', async () => {
  const range = await seedRange('A', 1000, 1999)
  const invoice = await draft()

  const issued = issuedBy(await issuance().issueInvoice(invoice.id, { prefix: 'A', at: AT }))

  assert.equal(issued.number, 1000)
  assert.equal(issued.prefix, 'A')
  assert.equal(issued.status, 'emitida')
  assert.equal(issued.issuedAt?.getTime(), AT)
  assert.equal(await pointerOf(range.id), 1001)
})

test('the issued number reaches the data the template paints', async () => {
  await seedRange('B', 1, 99)
  const invoice = await draft()

  await issuance().issueInvoice(invoice.id, { prefix: 'B', at: AT })

  const stored = await invoices().findOrThrow(invoice.id)
  assert.equal((stored.invoiceData.factura as IInvoiceRecord).numero, 'B1')
  assert.equal(stored.numero, 'B1')
})

test('issuing twice returns the same document without consuming another consecutive', async () => {
  const range = await seedRange('C', 500, 599)
  const invoice = await draft()

  const first = issuedBy(await issuance().issueInvoice(invoice.id, { prefix: 'C', at: AT }))
  const second = issuedBy(await issuance().issueInvoice(invoice.id, { prefix: 'C', at: AT }))

  assert.equal(first.number, 500)
  assert.equal(second.number, 500)
  assert.equal(await pointerOf(range.id), 501)
})

test('two documents in a row do not repeat a number', async () => {
  await seedRange('D', 10, 99)
  const first = await draft()
  const second = await draft()

  const one = issuedBy(await issuance().issueInvoice(first.id, { prefix: 'D', at: AT }))
  const two = issuedBy(await issuance().issueInvoice(second.id, { prefix: 'D', at: AT }))

  assert.equal(one.number, 10)
  assert.equal(two.number, 11)
})

test('arithmetic that does not add up rejects and burns no consecutive', async () => {
  const range = await seedRange('E', 700, 799)
  const invoice = await draft({
    ...DATA,
    factura: { numero: 'X', total: 999, base: 100, impuestos: 19, fecha: '2026-08-01' },
  })

  const result = await issuance().issueInvoice(invoice.id, { prefix: 'E', at: AT })

  assert.equal(refusalOf(result), 'ARITHMETIC_MISMATCH')
  assert.deepEqual(result.status === 'rejected' ? result.issues.map((issue) => issue.kind) : [], [
    'base',
    'total',
  ])
  assert.equal(await pointerOf(range.id), 700)
  assert.equal((await invoices().findOrThrow(invoice.id)).status, 'borrador')
})
