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

const ITEMS: IInvoiceRecord[] = [{ descripcion: 'Producto uno', total: 70 }]

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

  const issued = issuedBy(await invoices().issueInvoice(invoice.id, { prefix: 'A', at: AT }))

  assert.equal(issued.number, 1000)
  assert.equal(issued.prefix, 'A')
  assert.equal(issued.status, 'emitida')
  assert.equal(issued.issuedAt?.getTime(), AT)
  assert.equal(await pointerOf(range.id), 1001)
})

test('the issued number reaches the data the template paints', async () => {
  await seedRange('B', 1, 99)
  const invoice = await draft()

  await invoices().issueInvoice(invoice.id, { prefix: 'B', at: AT })

  const stored = await invoices().findOrThrow(invoice.id)
  assert.equal((stored.invoiceData.factura as IInvoiceRecord).numero, 'B1')
  assert.equal(stored.numero, 'B1')
})

test('issuing twice returns the same document without consuming another consecutive', async () => {
  const range = await seedRange('C', 500, 599)
  const invoice = await draft()

  const first = issuedBy(await invoices().issueInvoice(invoice.id, { prefix: 'C', at: AT }))
  const second = issuedBy(await invoices().issueInvoice(invoice.id, { prefix: 'C', at: AT }))

  assert.equal(first.number, 500)
  assert.equal(second.number, 500)
  assert.equal(await pointerOf(range.id), 501)
})

test('two documents in a row do not repeat a number', async () => {
  await seedRange('D', 10, 99)
  const first = await draft()
  const second = await draft()

  const one = issuedBy(await invoices().issueInvoice(first.id, { prefix: 'D', at: AT }))
  const two = issuedBy(await invoices().issueInvoice(second.id, { prefix: 'D', at: AT }))

  assert.equal(one.number, 10)
  assert.equal(two.number, 11)
})

test('arithmetic that does not add up rejects and burns no consecutive', async () => {
  const range = await seedRange('E', 700, 799)
  const invoice = await draft({
    ...DATA,
    factura: { numero: 'X', total: 999, base: 100, impuestos: 19, fecha: '2026-08-01' },
  })

  const result = await invoices().issueInvoice(invoice.id, { prefix: 'E', at: AT })

  assert.equal(refusalOf(result), 'ARITHMETIC_MISMATCH')
  assert.deepEqual(result.status === 'rejected' ? result.issues.map((issue) => issue.kind) : [], [
    'base',
    'total',
  ])
  assert.equal(await pointerOf(range.id), 700)
  assert.equal((await invoices().findOrThrow(invoice.id)).status, 'borrador')
})

test('a number ahead of the pointer drags the pointer past it', async () => {
  const range = await seedRange('F', 1000, 1999)
  const invoice = await draft()

  const issued = issuedBy(
    await invoices().issueInvoice(invoice.id, { prefix: 'F', number: 1500, at: AT }),
  )

  assert.equal(issued.number, 1500)
  assert.equal(await pointerOf(range.id), 1501)
})

test('a gap behind the pointer is filled without moving it', async () => {
  const range = await seedRange('G', 1000, 1999)
  const first = await draft()
  await invoices().issueInvoice(first.id, { prefix: 'G', number: 1200, at: AT })

  const second = await draft()
  const issued = issuedBy(
    await invoices().issueInvoice(second.id, { prefix: 'G', number: 1100, at: AT }),
  )

  assert.equal(issued.number, 1100)
  assert.equal(await pointerOf(range.id), 1201)
})

test('a number another document already carries is refused', async () => {
  await seedRange('H', 1, 99)
  const first = await draft()
  await invoices().issueInvoice(first.id, { prefix: 'H', number: 5, at: AT })

  const second = await draft()
  const result = await invoices().issueInvoice(second.id, { prefix: 'H', number: 5, at: AT })

  assert.equal(refusalOf(result), 'NUMBER_ALREADY_USED')
  assert.equal((await invoices().findOrThrow(second.id)).status, 'borrador')
})

test('a number outside every range is refused', async () => {
  await seedRange('I', 1, 99)
  const invoice = await draft()

  const result = await invoices().issueInvoice(invoice.id, { prefix: 'I', number: 5000, at: AT })

  assert.equal(refusalOf(result), 'NUMBER_OUT_OF_RANGE')
})

test('an exhausted range says so, and a valid one takes over', async () => {
  const spent = await seedRange('J', 1, 2)
  const first = await draft()
  const second = await draft()
  await invoices().issueInvoice(first.id, { prefix: 'J', at: AT })
  await invoices().issueInvoice(second.id, { prefix: 'J', at: AT })
  assert.equal((await ranges().findOrThrow(spent.id)).exhausted, true)

  const third = await draft()
  const refused = await invoices().issueInvoice(third.id, { prefix: 'J', number: 3, at: AT })
  assert.equal(refusalOf(refused), 'NUMBER_OUT_OF_RANGE')
  assert.equal(
    refusalOf(await invoices().issueInvoice(third.id, { prefix: 'J', at: AT })),
    'RANGE_EXHAUSTED',
  )

  await seedRange('J', 3, 4)
  const accepted = issuedBy(await invoices().issueInvoice(third.id, { prefix: 'J', at: AT }))
  assert.equal(accepted.number, 3)
})

test('a range outside its validity does not issue', async () => {
  await seedRange('K', 1, 99, Date.UTC(2026, 5, 30))
  const invoice = await draft()

  const result = await invoices().issueInvoice(invoice.id, { prefix: 'K', at: AT })

  assert.equal(refusalOf(result), 'RANGE_EXPIRED')
})

test('without any range for its document type there is nothing to issue against', async () => {
  await seedRange('M', 1, 99)
  const invoice = issuedBy(
    await invoices().issueInvoice((await draft()).id, { prefix: 'M', at: AT }),
  )
  const note = await invoices().createCreditNoteFor(invoice.id)
  const ready = await invoices().saveInvoice(
    note.id,
    {
      templateId,
      data: note.invoiceData,
      items: note.invoiceItems,
      correctionReason: 'Anulación total',
    },
    note.rev,
  )

  const result = await invoices().issueInvoice(ready.invoice.id, { at: AT })

  assert.equal(refusalOf(result), 'NO_NUMBER_RANGE')
})

test('saving over an issued document writes absolutely nothing', async () => {
  await seedRange('L', 1, 99)
  const invoice = await draft()
  const issued = issuedBy(await invoices().issueInvoice(invoice.id, { prefix: 'L', at: AT }))

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
