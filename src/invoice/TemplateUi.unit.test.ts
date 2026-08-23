import assert from 'node:assert/strict'
import { seedCompany } from '../company/__fixtures__/seededCompany'
import test, { after, before } from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { createSignedInHarness, type ISignedInHarness } from '../auth/__fixtures__/signedIn'
import { EmbedController } from './EmbedController'
import { TemplateController } from './TemplateController'
import { HandoffRepository } from './models/handoff/HandoffRepository'
import { TemplateRepository } from './models/template/TemplateRepository'
import { invoiceDocumentFixture } from './render/__fixtures__/invoiceDocument'
import { INVOICE_DATA, INVOICE_ITEMS } from './render/__fixtures__/renderToHtml'
import type { IHandoffRecord } from './models/handoff/Handoff'
import { TEMPLATE_PRESETS } from './templates/presets'

useMemoryRepositories()

let companyId = ''
container.register(Locker, { useToken: InMemoryLocker })

let harness: ISignedInHarness

before(async () => {
  companyId = await seedCompany()
  harness = await createSignedInHarness([TemplateController, EmbedController])
})

after(async () => {
  await harness.close()
})

test('with no templates the index states it plainly', async () => {
  const page = await harness.get('/templates')

  assert.equal(page.status, 200)
  assert.match(page.text, /Todavía no hay plantillas/)
  assert.doesNotMatch(page.text, /<table>/)
})

test('the index lists a template as a row once one exists', async () => {
  const template = await container
    .resolve(TemplateRepository)
    .createTemplate('con-diseño', invoiceDocumentFixture(), companyId)

  const page = await harness.get('/templates')

  assert.match(page.text, /<table>/)
  assert.match(page.text, /con-diseño/)
  assert.match(page.text, new RegExp(`/templates/${template.id}`))
  assert.doesNotMatch(page.text, /Todavía no hay plantillas/)
})

test('the editor shell carries the design system', async () => {
  const page = await harness.get('/templates')

  assert.match(page.text, /@layer wabot-design/)
  assert.match(page.text, /--c-bg/)
  assert.match(page.text, /--c-action/)
})

test('the design system is injected once per page, not once per view', async () => {
  const page = await harness.get('/templates')

  const occurrences = page.text.split('@layer wabot-design').length - 1
  assert.equal(occurrences, 1)
})

test('the document surface is reset so application styles cannot reach the invoice', async () => {
  const page = await harness.get('/templates')

  assert.match(page.text, /\[data-document-surface\] \*/)
  assert.match(page.text, /all: revert/)
})

test('the embed carries no application styles at all', async () => {
  const template = await container
    .resolve(TemplateRepository)
    .createTemplate('sin-diseño', invoiceDocumentFixture(), companyId)
  const handoff = await container
    .resolve(HandoffRepository)
    .createHandoff(
      template.id,
      INVOICE_DATA as unknown as IHandoffRecord,
      INVOICE_ITEMS as unknown as IHandoffRecord[],
    )

  const page = await harness.get(`/embed/${handoff.token}`)

  assert.equal(page.status, 200)
  assert.doesNotMatch(page.text, /@layer wabot-design/)
  assert.doesNotMatch(page.text, /--c-bg\b/)
  assert.doesNotMatch(page.text, /--c-action\b/)
  assert.doesNotMatch(page.text, /data-document-surface/)
  assert.match(page.text, /@page/)
})

test('the editor page ships no external stylesheet, font or icon', async () => {
  const page = await harness.get('/templates')

  assert.doesNotMatch(page.text, /<link[^>]+rel="stylesheet"[^>]+https?:/)
  assert.doesNotMatch(page.text, /url\(\s*['"]?https?:/)
  assert.doesNotMatch(page.text, /@import/)
  assert.doesNotMatch(page.text, /@font-face/)
})

test('the gallery shows a card per design plus the blank one', async () => {
  const page = await harness.get('/templates')

  for (const preset of TEMPLATE_PRESETS) {
    assert.match(page.text, new RegExp(`value="${preset.id}"`))
    assert.ok(page.text.includes(preset.name), `${preset.id} has no name on its card`)
    assert.ok(page.text.includes(preset.description), `${preset.id} has no description`)
  }
  assert.match(page.text, /id="preset-blank"[^>]*checked/)
})

test('every card carries a document painted by the render engine', async () => {
  const page = await harness.get('/templates')

  const papers = page.text.match(/data-band="header"/g) ?? []
  assert.equal(papers.length, TEMPLATE_PRESETS.length)
  assert.match(page.text, /class="wb-preset-paper"/)
})

test('the gallery never leaks a page rule into the templates page', async () => {
  const page = await harness.get('/templates')

  assert.equal(page.text.includes('@page'), false)
})
