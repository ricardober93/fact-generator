import assert from 'node:assert/strict'
import test, { before } from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { seedCompany } from '../company/__fixtures__/seededCompany'
import { Issuance } from './Issuance'
import type { IInvoiceRecord } from './models/invoice/Invoice'
import { InvoiceRepository } from './models/invoice/InvoiceRepository'
import { TemplateRepository } from './models/template/TemplateRepository'
import { NumberRangeRepository } from '../numbering/app'
import { findTemplatePreset } from './templates/presets'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

const DATA: IInvoiceRecord = {
  cliente: { nombre: 'Ana Pérez' },
  factura: { numero: 'X', total: 50, fecha: '2026-08-01' },
}

const FROM_CATALOG: IInvoiceRecord = {
  ref: 'sku:1',
  descripcion: 'Producto uno',
  cantidad: 2,
  precio: 25,
  total: 50,
}

let templateId = ''
let companyId = ''

function invoices(): InvoiceRepository {
  return container.resolve(InvoiceRepository)
}

before(async () => {
  companyId = await seedCompany()
  const doc = findTemplatePreset('chevron-slate')!.build()
  templateId = (await container.resolve(TemplateRepository).createTemplate('D', doc, companyId)).id
  await container.resolve(NumberRangeRepository).createRange({
    owner: companyId,
    series: 'factura',
    prefix: 'FE',
    from: 1,
    to: 99,
    validFrom: Date.UTC(2020, 0, 1),
    validTo: Date.UTC(2099, 11, 31),
  })
})

test('a line keeps its reference alongside its values, never instead of them', async () => {
  const created = await invoices().createInvoice({
    templateId,
    companyId,
    data: DATA,
    items: [FROM_CATALOG],
  })

  const stored = await invoices().findOrThrow(created.id)
  const line = stored.invoiceItems[0] as IInvoiceRecord

  assert.equal(line.ref, 'sku:1')
  assert.equal(line.descripcion, 'Producto uno')
  assert.equal(line.total, 50)
})

test('the reference survives issuing, frozen with the rest', async () => {
  const draft = await invoices().createInvoice({
    templateId,
    companyId,
    data: DATA,
    items: [FROM_CATALOG],
  })

  const result = await container.resolve(Issuance).issueInvoice(draft.id)

  assert.equal(result.status, 'issued')
  const line = (result.status === 'issued' ? result.invoice.invoiceItems[0] : {}) as IInvoiceRecord
  assert.equal(line.ref, 'sku:1')
})

test('nothing in the render path knows the catalog exists', async () => {
  const { readFileSync, readdirSync, statSync } = await import('node:fs')
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = `${dir}/${name}`
      return statSync(full).isDirectory() ? walk(full) : [full]
    })

  const offenders = walk('src/invoice/render')
    .filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'))
    .filter((file) => readFileSync(file, 'utf8').includes('catalog/app'))

  assert.deepEqual(offenders, [])
})
