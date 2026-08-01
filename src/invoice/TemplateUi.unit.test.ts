import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import {
  createUiHarness,
  useMemoryRepositories,
  type UiHarness,
} from '@wabot-dev/framework/testing'
import { EmbedController } from './EmbedController'
import { TemplateController } from './TemplateController'
import { HandoffRepository } from './models/handoff/HandoffRepository'
import { TemplateRepository } from './models/template/TemplateRepository'
import { invoiceDocumentFixture } from './render/__fixtures__/invoiceDocument'
import { INVOICE_DATA, INVOICE_ITEMS } from './render/__fixtures__/renderToHtml'
import type { IHandoffRecord } from './models/handoff/Handoff'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

let harness: UiHarness

before(async () => {
  harness = await createUiHarness({ controllers: [TemplateController, EmbedController] })
})

after(async () => {
  await harness.close()
})

test('with no templates the index states it plainly', async () => {
  const page = await harness.get('/templates')

  assert.equal(page.status, 200)
  assert.match(page.text, /Todavía no hay plantillas/)
  assert.doesNotMatch(page.text, /<tbody>/)
})

test('the index lists a template as a row once one exists', async () => {
  const template = await container
    .resolve(TemplateRepository)
    .createTemplate('con-diseño', invoiceDocumentFixture())

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
    .createTemplate('sin-diseño', invoiceDocumentFixture())
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
