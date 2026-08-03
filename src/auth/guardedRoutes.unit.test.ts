import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { EmbedController } from '../invoice/EmbedController'
import { InvoiceController } from '../invoice/InvoiceController'
import { TemplateController } from '../invoice/TemplateController'
import { HandoffRepository } from '../invoice/models/handoff/HandoffRepository'
import { InvoiceRepository } from '../invoice/models/invoice/InvoiceRepository'
import { TemplateRepository } from '../invoice/models/template/TemplateRepository'
import { invoiceDocumentFixture } from '../invoice/render/__fixtures__/invoiceDocument'
import { INVOICE_DATA, INVOICE_ITEMS } from '../invoice/render/__fixtures__/renderToHtml'
import { createSignedInHarness, type ISignedInHarness } from './__fixtures__/signedIn'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

let harness: ISignedInHarness
let templateId = ''

before(async () => {
  harness = await createSignedInHarness([InvoiceController, TemplateController, EmbedController])
  const template = await container
    .resolve(TemplateRepository)
    .createTemplate('Guardada', invoiceDocumentFixture())
  templateId = template.id
})

after(async () => {
  await harness.close()
})

function handoffs(): HandoffRepository {
  return container.resolve(HandoffRepository)
}

test('the invoice list is closed to anonymous visitors', async () => {
  const page = await harness.anonymous.get('/invoices', { redirect: 'manual' })

  assert.equal(page.status, 302)
  assert.match(page.headers.get('location') ?? '', /^\/login\?next=/)
  assert.equal(page.text.includes('Facturas'), false)
})

test('a single invoice is closed to anonymous visitors', async () => {
  const page = await harness.anonymous.get('/invoices/new', { redirect: 'manual' })

  assert.equal(page.status, 302)
})

test('the template index and editor are closed to anonymous visitors', async () => {
  const index = await harness.anonymous.get('/templates', { redirect: 'manual' })
  const editor = await harness.anonymous.get(`/templates/${templateId}`, { redirect: 'manual' })

  assert.equal(index.status, 302)
  assert.equal(editor.status, 302)
  assert.equal(editor.text.includes('data-canvas'), false)
})

test('saving an invoice anonymously writes nothing', async () => {
  const invoices = container.resolve(InvoiceRepository)
  const before = (await invoices.findAll()).length

  const response = await harness.anonymous.action('/invoices/_action/save', {
    templateId,
    data: INVOICE_DATA,
    items: INVOICE_ITEMS,
  })

  assert.equal(response.status, 401)
  assert.equal((await invoices.findAll()).length, before)
})

test('minting a handoff anonymously mints nothing', async () => {
  const before = (await handoffs().findAll()).length

  const response = await harness.anonymous.action('/embed/_action/prepare', {
    templateId,
    data: INVOICE_DATA,
    items: INVOICE_ITEMS,
  })

  assert.equal(response.status, 401)
  assert.equal(response.json().token, undefined)
  assert.equal((await handoffs().findAll()).length, before)
})

test('minting a handoff with a session still works', async () => {
  const response = await harness.action('/embed/_action/prepare', {
    templateId,
    data: INVOICE_DATA,
    items: INVOICE_ITEMS,
  })

  assert.equal(response.status, 200)
  assert.equal(typeof response.json().token, 'string')
})

test('a signed in operator always has a way out', async () => {
  const invoices = await harness.get('/invoices')
  const templates = await harness.get('/templates')

  assert.match(invoices.text, /action="\/login\/_action\/signOut"/)
  assert.match(templates.text, /action="\/login\/_action\/signOut"/)
})

test('rendering a minted handoff stays public', async () => {
  const minted = await harness.action('/embed/_action/prepare', {
    templateId,
    data: INVOICE_DATA,
    items: INVOICE_ITEMS,
  })

  const page = await harness.anonymous.get(`/embed/${minted.json().token}`)

  assert.equal(page.status, 200)
  assert.match(page.text, /Acme S\.L\./)
})
