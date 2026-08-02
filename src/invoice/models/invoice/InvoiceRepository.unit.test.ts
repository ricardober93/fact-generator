import assert from 'node:assert/strict'
import test from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { findTemplatePreset } from '../../templates/presets'
import { TemplateRepository } from '../template/TemplateRepository'
import { InvoiceRepository } from './InvoiceRepository'
import type { IInvoiceRecord } from './Invoice'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

const DATA: IInvoiceRecord = {
  emisor: { nombre: 'Acme S.L.' },
  cliente: { nombre: 'Ana Pérez' },
  factura: { numero: 'F-2026-014', total: 145, fecha: '2026-08-01' },
}

const ITEMS: IInvoiceRecord[] = [{ descripcion: 'Producto uno', total: 70 }]

function invoices(): InvoiceRepository {
  return container.resolve(InvoiceRepository)
}

async function seedTemplate(): Promise<string> {
  const doc = findTemplatePreset('chevron-slate')!.build()
  const template = await container.resolve(TemplateRepository).createTemplate('Diseño', doc)
  return template.id
}

test('an invoice round trips with exactly what it was given', async () => {
  const templateId = await seedTemplate()

  const created = await invoices().createInvoice({
    templateId,
    data: DATA,
    items: ITEMS,
    params: { moneda: 'USD' },
  })
  const found = await invoices().find(created.id)

  assert.ok(found)
  assert.equal(found.templateId, templateId)
  assert.deepEqual(found.invoiceData, DATA)
  assert.deepEqual(found.invoiceItems, ITEMS)
  assert.deepEqual(found.params, { moneda: 'USD' })
})

test('an invoice stores no rendered paper of any kind', async () => {
  const templateId = await seedTemplate()

  const created = await invoices().createInvoice({ templateId, data: DATA, items: ITEMS })
  const stored = JSON.stringify((await invoices().find(created.id)) ?? {})

  assert.equal(stored.includes('<div'), false)
  assert.equal(stored.includes('data-band'), false)
  assert.equal(stored.includes('%PDF'), false)
  assert.equal(stored.includes('bands'), false)
})

test('an invoice missing a required path is never persisted', async () => {
  const templateId = await seedTemplate()
  const before = (await invoices().findAll()).length

  await assert.rejects(
    () => invoices().createInvoice({ templateId, data: { emisor: {} }, items: ITEMS }),
    /Missing required data/,
  )

  assert.equal((await invoices().findAll()).length, before)
})

test('an unknown template is rejected', async () => {
  await assert.rejects(
    () => invoices().createInvoice({ templateId: 'nope', data: DATA, items: ITEMS }),
    /Unknown template/,
  )
})

test('totals that do not match the lines are stored exactly as sent', async () => {
  const templateId = await seedTemplate()
  const data: IInvoiceRecord = {
    ...DATA,
    factura: { numero: 'F-1', total: 9999, base: 1, fecha: '2026-08-01' },
  }

  const created = await invoices().createInvoice({ templateId, data, items: ITEMS })
  const found = await invoices().find(created.id)

  assert.deepEqual(found!.invoiceData.factura, {
    numero: 'F-1',
    total: 9999,
    base: 1,
    fecha: '2026-08-01',
  })
})

test('saving an invoice replaces its content and keeps its id', async () => {
  const templateId = await seedTemplate()
  const created = await invoices().createInvoice({ templateId, data: DATA, items: ITEMS })

  const saved = await invoices().saveInvoice(created.id, {
    templateId,
    data: { ...DATA, cliente: { nombre: 'Luis Gómez' } },
    items: [],
  })

  assert.equal(saved.id, created.id)
  assert.deepEqual(saved.invoiceItems, [])
  assert.equal((saved.invoiceData.cliente as IInvoiceRecord).nombre, 'Luis Gómez')
})

test('the summary reads the conventional paths and tolerates their absence', async () => {
  const templateId = await seedTemplate()

  const created = await invoices().createInvoice({ templateId, data: DATA, items: ITEMS })

  assert.deepEqual(created.summary, {
    numero: 'F-2026-014',
    cliente: 'Ana Pérez',
    total: '145',
    fecha: '2026-08-01',
  })
})

test('invoices sharing a number are found together', async () => {
  const templateId = await seedTemplate()
  const repeated: IInvoiceRecord = { ...DATA, factura: { numero: 'F-REPE', total: 1 } }
  await invoices().createInvoice({ templateId, data: repeated, items: ITEMS })
  await invoices().createInvoice({ templateId, data: repeated, items: ITEMS })

  assert.equal((await invoices().findByNumero('F-REPE')).length, 2)
  assert.deepEqual(await invoices().findByNumero('no-existe'), [])
  assert.deepEqual(await invoices().findByNumero(''), [])
})
