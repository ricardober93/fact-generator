import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { UiControllerMetadataStore } from '@wabot-dev/framework/ui'
import {
  createUiHarness,
  useMemoryRepositories,
  type UiHarness,
} from '@wabot-dev/framework/testing'
import { EmbedController } from './EmbedController'
import { AssetRepository } from './models/asset/AssetRepository'
import { Handoff, HANDOFF_TTL_MS, type IHandoffRecord } from './models/handoff/Handoff'
import { HandoffRepository } from './models/handoff/HandoffRepository'
import { TemplateRepository } from './models/template/TemplateRepository'
import { invoiceDocumentFixture } from './render/__fixtures__/invoiceDocument'
import { INVOICE_DATA, INVOICE_ITEMS } from './render/__fixtures__/renderToHtml'
import type { IDocument } from './render/document'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

const DATA = INVOICE_DATA as unknown as IHandoffRecord
const ITEMS = INVOICE_ITEMS as unknown as IHandoffRecord[]

let harness: UiHarness

before(async () => {
  harness = await createUiHarness({ controllers: [EmbedController] })
})

after(async () => {
  await harness.close()
})

function handoffs(): HandoffRepository {
  return container.resolve(HandoffRepository)
}

async function templateWith(name: string, doc: IDocument = invoiceDocumentFixture()) {
  return container.resolve(TemplateRepository).createTemplate(name, doc)
}

async function prepare(templateId: string, data = DATA, items = ITEMS): Promise<string> {
  const response = await harness.action('/embed/_action/prepare', { templateId, data, items })
  assert.equal(response.status, 200)
  return response.json().token as string
}

test('prepare hands back a token and the embed paints that invoice', async () => {
  const template = await templateWith('embed')

  const token = await prepare(template.id)
  const page = await harness.get(`/embed/${token}`)

  assert.equal(page.status, 200)
  assert.match(page.text, /Acme S\.L\./)
  assert.match(page.text, /Ana Pérez/)
  assert.match(page.text, /F-2026-014/)
  assert.match(page.text, /Diseño de marca/)
})

test('the document is server rendered, print CSS included, without hydration', async () => {
  const template = await templateWith('printable')

  const page = await harness.get(`/embed/${await prepare(template.id)}`)

  assert.match(page.text, /@page/)
  assert.match(page.text, /210mm 297mm/)
  assert.match(page.text, /@media print \{ \.wb-page-footer \{ position: fixed;/)
  assert.match(page.text, /<wabot-island data-island="EmbedFrame"[^>]*><\/wabot-island>/)
  assert.match(page.text, /Acme S\.L\./)
})

test('an expired token and an unknown token answer exactly the same', async () => {
  const template = await templateWith('expiry')
  const token = await prepare(template.id)
  const stored = await handoffs().findOneByToken(token)
  assert.ok(stored)
  stored.update({ expiresAt: Date.now() - 1 })
  await handoffs().update(stored)

  const expired = await harness.get(`/embed/${token}`)
  const unknown = await harness.get('/embed/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')

  assert.equal(expired.status, 404)
  assert.equal(unknown.status, 404)
  assert.match(expired.text, /ya no está disponible/)
  assert.equal(expired.text, unknown.text)
})

test('two tokens with different data give two different documents', async () => {
  const template = await templateWith('two-tokens')
  const other = {
    ...DATA,
    cliente: { nombre: 'Luis Ortega' },
    factura: { numero: 'F-2026-099', total: 12 },
  } as unknown as IHandoffRecord

  const first = await harness.get(`/embed/${await prepare(template.id)}`)
  const second = await harness.get(`/embed/${await prepare(template.id, other)}`)

  assert.match(first.text, /Ana Pérez/)
  assert.doesNotMatch(first.text, /Luis Ortega/)
  assert.match(second.text, /Luis Ortega/)
  assert.doesNotMatch(second.text, /Ana Pérez/)
})

test('a declared parameter is applied, an undeclared one is ignored', async () => {
  const template = await templateWith('params')
  const token = await prepare(template.id)

  const applied = await harness.get(`/embed/${token}`, { query: { color: '#ff0000' } })
  const ignored = await harness.get(`/embed/${token}`, { query: { sombrero: 'rojo' } })

  assert.equal(applied.status, 200)
  assert.match(applied.text, /#ff0000/)
  assert.equal(ignored.status, 200)
  assert.doesNotMatch(ignored.text, /sombrero/)
  assert.doesNotMatch(ignored.text, /rojo/)
})

test('an inadmissible value falls back to the default and still answers 200', async () => {
  const template = await templateWith('bad-param')
  const token = await prepare(template.id)

  const page = await harness.get(`/embed/${token}`, { query: { density: '72pt' } })

  assert.equal(page.status, 200)
  assert.match(page.text, /--fontSizeBase:10pt/)
  assert.doesNotMatch(page.text, /72pt/)
})

test('a handoff that skipped validation names the missing path, with no stack trace', async () => {
  const template = await templateWith('incomplete')
  const smuggled = new Handoff({
    token: 'sneakysneakysneakysneakysneaky12',
    templateId: template.id,
    data: { cliente: { nombre: 'Ana' } },
    items: [],
    params: {},
    expiresAt: Date.now() + HANDOFF_TTL_MS,
  })
  await handoffs().create(smuggled)

  const page = await harness.get(`/embed/${smuggled.token}`)

  assert.match(page.text, /emisor\.nombre/)
  assert.match(page.text, /factura\.numero/)
  assert.doesNotMatch(page.text, /\.tsx?:\d+/)
  assert.doesNotMatch(page.text, /at Object|at async/)
})

test('the embed renders a stored logo as a data URI image', async () => {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const logo = await container
    .resolve(AssetRepository)
    .upload(Buffer.concat([signature, Buffer.alloc(16, 9)]).toString('base64'))
  const doc = invoiceDocumentFixture()
  doc.theme.logo = logo.id
  const template = await templateWith('with-logo', doc)

  const page = await harness.get(`/embed/${await prepare(template.id)}`)

  assert.match(page.text, /<img src="data:image\/png;base64,/)
})

test('the embed view is never a static page', () => {
  const views = container.resolve(UiControllerMetadataStore).getControllerViewsInfo(EmbedController)

  assert.equal(views.length, 1)
  assert.equal(views[0].config?.static, undefined)
})
