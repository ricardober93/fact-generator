import assert from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import test, { after, before } from 'node:test'
import { container, Env, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { createSignedInHarness, type ISignedInHarness } from '../auth/__fixtures__/signedIn'
import { CatalogSource, HttpCatalogSource, LocalCatalogSource } from '../catalog/app'
import { seedCompany } from '../company/__fixtures__/seededCompany'
import { InvoiceController } from './InvoiceController'
import type { IInvoiceRecord } from './models/invoice/Invoice'
import { InvoiceRepository } from './models/invoice/InvoiceRepository'
import { TemplateRepository } from './models/template/TemplateRepository'
import { findTemplatePreset } from './templates/presets'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

const ONE = { ref: 'sku:1', code: 'A-1', label: 'Producto uno', unitPrice: 25, taxRate: 19 }

let provider: Server
let harness: ISignedInHarness
let templateId = ''
let companyId = ''
let alive = true

before(async () => {
  provider = createServer((_req, res) => {
    if (!alive) {
      res.destroy()
      return
    }
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify([ONE]))
  })
  await new Promise<void>((resolve) => provider.listen(0, resolve))
  const address = provider.address()
  const port = typeof address === 'object' && address ? address.port : 0
  process.env.CATALOG_URL = `http://127.0.0.1:${port}`
  container.registerInstance(
    CatalogSource,
    new CatalogSource(new HttpCatalogSource(new Env()), container.resolve(LocalCatalogSource)),
  )

  companyId = await seedCompany()
  const doc = findTemplatePreset('chevron-slate')!.build()
  templateId = (await container.resolve(TemplateRepository).createTemplate('D', doc, companyId)).id
  harness = await createSignedInHarness([InvoiceController])
})

after(async () => {
  await harness.close()
  await new Promise<void>((resolve) => provider.close(() => resolve()))
})

test('with a source configured the editor offers the catalog', async () => {
  const page = await harness.get('/invoices/new')

  assert.match(page.text, /data-catalog="true"/)
  assert.match(page.text, /Buscar en el catálogo/)
})

test('the search action returns what the provider serves', async () => {
  const result = await harness.action('/invoices/_action/searchCatalog', { text: 'uno' })
  const body = await result.json()

  assert.deepEqual(body.items, [ONE])
})

test('a provider that is down answers with no results, not an error', async () => {
  alive = false

  const result = await harness.action('/invoices/_action/searchCatalog', { text: 'uno' })
  const body = await result.json()

  assert.equal(result.status, 200)
  assert.deepEqual(body.items, [])
  alive = true
})

test('with the provider down an invoice is still written by hand and saved', async () => {
  alive = false

  const saved = await harness.action('/invoices/_action/save', {
    templateId,
    data: { cliente: { nombre: 'Ana' }, factura: { total: 10 } },
    items: [{ descripcion: 'A mano', total: 10 }],
  })
  const body = await saved.json()

  assert.equal(body.status, 'saved')
  assert.ok(await container.resolve(InvoiceRepository).find(body.id))
  alive = true
})

test('a line chosen from the catalog keeps its reference when saved', async () => {
  const line: IInvoiceRecord = {
    ref: ONE.ref,
    descripcion: ONE.label,
    cantidad: 1,
    precio: 25,
    total: 25,
  }

  const saved = await harness.action('/invoices/_action/save', {
    templateId,
    data: { cliente: { nombre: 'Ana' }, factura: { total: 25 } },
    items: [line],
  })
  const body = await saved.json()

  const stored = await container.resolve(InvoiceRepository).findOrThrow(body.id)
  assert.equal((stored.invoiceItems[0] as IInvoiceRecord).ref, 'sku:1')
})
