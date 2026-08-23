import assert from 'node:assert/strict'
import { seedCompany } from '../../../company/__fixtures__/seededCompany'
import test from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { findTemplatePreset } from '../../templates/presets'
import { TemplateRepository } from '../template/TemplateRepository'
import { InvoiceRepository } from './InvoiceRepository'
import { Invoice, type IInvoiceRecord } from './Invoice'

useMemoryRepositories()

let companyId = ''
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

function numbered(numero: string): IInvoiceRecord {
  return { ...DATA, factura: { ...(DATA.factura as IInvoiceRecord), numero } }
}

test.before(async () => {
  companyId = await seedCompany()
})

async function seedTemplate(): Promise<string> {
  const doc = findTemplatePreset('chevron-slate')!.build()
  const template = await container
    .resolve(TemplateRepository)
    .createTemplate('Diseño', doc, companyId)
  return template.id
}

test('an invoice round trips with exactly what it was given', async () => {
  const templateId = await seedTemplate()

  const created = await invoices().createInvoice({
    templateId,
    companyId,
    data: DATA,
    items: ITEMS,
    params: { moneda: 'USD' },
  })
  const found = await invoices().find(created.id)

  assert.ok(found)
  assert.equal(found.templateId, templateId)
  assert.deepEqual(found.invoiceData.cliente, DATA.cliente)
  assert.deepEqual(found.invoiceData.factura, DATA.factura)
  assert.equal((found.invoiceData.emisor as IInvoiceRecord).nombre, 'Acme S.A.S.')
  assert.deepEqual(found.invoiceItems, ITEMS)
  assert.deepEqual(found.params, { moneda: 'USD' })
})

test('an invoice stores no rendered paper of any kind', async () => {
  const templateId = await seedTemplate()

  const created = await invoices().createInvoice({
    templateId,
    companyId,
    data: DATA,
    items: ITEMS,
  })
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
    () => invoices().createInvoice({ templateId, companyId, data: { emisor: {} }, items: ITEMS }),
    /Missing required data/,
  )

  assert.equal((await invoices().findAll()).length, before)
})

test('an unknown template is rejected', async () => {
  await assert.rejects(
    () => invoices().createInvoice({ templateId: 'nope', companyId, data: DATA, items: ITEMS }),
    /Unknown template/,
  )
})

test('totals that do not match the lines are stored exactly as sent', async () => {
  const templateId = await seedTemplate()
  const data: IInvoiceRecord = {
    ...DATA,
    factura: { numero: 'F-1', total: 9999, base: 1, fecha: '2026-08-01' },
  }

  const created = await invoices().createInvoice({ templateId, companyId, data, items: ITEMS })
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
  const created = await invoices().createInvoice({
    templateId,
    companyId,
    data: DATA,
    items: ITEMS,
  })

  const result = await invoices().saveInvoice(
    created.id,
    {
      templateId,
      companyId,
      data: { ...DATA, cliente: { nombre: 'Luis Gómez' } },
      items: [],
    },
    created.rev,
  )

  assert.equal(result.status, 'saved')
  assert.equal(result.invoice.id, created.id)
  assert.deepEqual(result.invoice.invoiceItems, [])
  assert.equal((result.invoice.invoiceData.cliente as IInvoiceRecord).nombre, 'Luis Gómez')
})

test('the summary reads the conventional paths and tolerates their absence', async () => {
  const templateId = await seedTemplate()

  const created = await invoices().createInvoice({
    templateId,
    companyId,
    data: DATA,
    items: ITEMS,
  })

  assert.deepEqual(created.summary, {
    numero: 'F-2026-014',
    cliente: 'Ana Pérez',
    total: '145',
    fecha: '2026-08-01',
  })
})

test('a new invoice starts at revision one', async () => {
  const templateId = await seedTemplate()

  const created = await invoices().createInvoice({
    templateId,
    companyId,
    data: DATA,
    items: ITEMS,
  })

  assert.equal(created.rev, 1)
})

test('saving with the stored revision raises the counter', async () => {
  const templateId = await seedTemplate()
  const created = await invoices().createInvoice({
    templateId,
    companyId,
    data: DATA,
    items: ITEMS,
  })

  const result = await invoices().saveInvoice(
    created.id,
    { templateId, companyId, data: numbered('A-2'), items: ITEMS },
    created.rev,
  )

  assert.equal(result.status, 'saved')
  assert.equal(result.invoice.rev, 2)
})

test('saving with a stale revision writes absolutely nothing', async () => {
  const templateId = await seedTemplate()
  const created = await invoices().createInvoice({
    templateId,
    companyId,
    data: DATA,
    items: ITEMS,
  })
  await invoices().saveInvoice(
    created.id,
    { templateId, companyId, data: numbered('A-2'), items: ITEMS },
    created.rev,
  )

  const late = await invoices().saveInvoice(
    created.id,
    { templateId, companyId, data: numbered('A-999'), items: [] },
    created.rev,
  )

  assert.equal(late.status, 'conflict')
  const stored = await invoices().find(created.id)
  assert.equal(stored!.numero, 'A-2')
  assert.equal(stored!.rev, 2)
  assert.deepEqual(stored!.invoiceItems, ITEMS)
})

test('of two saves from the same starting point only the first lands', async () => {
  const templateId = await seedTemplate()
  const created = await invoices().createInvoice({
    templateId,
    companyId,
    data: DATA,
    items: ITEMS,
  })

  const first = await invoices().saveInvoice(
    created.id,
    { templateId, companyId, data: numbered('primero'), items: ITEMS },
    1,
  )
  const second = await invoices().saveInvoice(
    created.id,
    { templateId, companyId, data: numbered('segundo'), items: ITEMS },
    1,
  )

  assert.equal(first.status, 'saved')
  assert.equal(second.status, 'conflict')
  assert.equal((await invoices().find(created.id))!.numero, 'primero')
})

test('an invoice stored without a counter saves by sending zero', async () => {
  const templateId = await seedTemplate()
  const legacy = new Invoice({ templateId, data: DATA, items: ITEMS, params: {} })
  await invoices().create(legacy)

  const result = await invoices().saveInvoice(
    legacy.id,
    { templateId, companyId, data: numbered('A-nuevo'), items: ITEMS },
    0,
  )

  assert.equal(result.status, 'saved')
  assert.equal(result.invoice.rev, 1)
})

test('an invoice stored without a counter still conflicts if someone got there first', async () => {
  const templateId = await seedTemplate()
  const legacy = new Invoice({ templateId, data: DATA, items: ITEMS, params: {} })
  await invoices().create(legacy)
  await invoices().saveInvoice(
    legacy.id,
    { templateId, companyId, data: numbered('otra-pestaña'), items: ITEMS },
    0,
  )

  const late = await invoices().saveInvoice(
    legacy.id,
    { templateId, companyId, data: numbered('llego-tarde'), items: ITEMS },
    0,
  )

  assert.equal(late.status, 'conflict')
  assert.equal((await invoices().find(legacy.id))!.numero, 'otra-pestaña')
})

test('saving an invoice that does not exist is an error, not a conflict', async () => {
  const templateId = await seedTemplate()

  await assert.rejects(() =>
    invoices().saveInvoice('no-existe', { templateId, companyId, data: DATA, items: ITEMS }, 1),
  )
})
