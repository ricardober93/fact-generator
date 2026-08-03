import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { UiControllerMetadataStore } from '@wabot-dev/framework/ui'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { createSignedInHarness, type ISignedInHarness } from '../auth/__fixtures__/signedIn'
import { TemplateController } from './TemplateController'
import { TemplateRepository } from './models/template/TemplateRepository'
import { emptyDocument, type IDocument } from './render/document'
import { invoiceDocumentFixture } from './render/__fixtures__/invoiceDocument'
import { addBlock, setBlockProp } from './ui/documentEdits'
import { TEMPLATE_PRESETS } from './templates/presets'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

let harness: ISignedInHarness

before(async () => {
  harness = await createSignedInHarness([TemplateController])
})

after(async () => {
  await harness.close()
})

function templates(): TemplateRepository {
  return container.resolve(TemplateRepository)
}

async function newTemplate(name: string, doc: IDocument = invoiceDocumentFixture()) {
  return templates().createTemplate(name, doc)
}

test('creating a template lands on the editor of the template just created', async () => {
  await harness.action('/templates/_action/create', { name: 'Nueva' })

  const stored = await templates().findOneByName('Nueva')
  assert.ok(stored)
  assert.equal(stored.rev, 1)

  const page = await harness.get(`/templates/${stored.id}`)
  assert.equal(page.status, 200)
  assert.match(page.text, /wabot-island data-island="Editor"/)
})

test('the editor page paints the stored document server side, with sample data', async () => {
  const template = await newTemplate('pintada')

  const page = await harness.get(`/templates/${template.id}`)

  assert.equal(page.status, 200)
  assert.match(page.text, /data-band="header"/)
  assert.match(page.text, /data-block="issuer"/)
  assert.match(page.text, /data-band="pageFooter"/)
  assert.match(page.text, /Texto/)
  assert.doesNotMatch(page.text, /Acme S\.L\./)
})

test('the index lists the templates with their revision', async () => {
  const template = await newTemplate('listada')

  const page = await harness.get('/templates')

  assert.equal(page.status, 200)
  assert.match(page.text, /listada/)
  assert.match(page.text, new RegExp(`/templates/${template.id}`))
  assert.match(page.text, /rev 1/)
})

test('a clean save advances the revision and stores what was sent', async () => {
  const template = await newTemplate('guardable')
  const edited = setBlockProp(template.doc, 'header', 'issuer', 'align', 'right')

  const saved = await harness.action('/templates/_action/save', {
    id: template.id,
    doc: edited,
    rev: 1,
  })

  assert.equal(saved.status, 200)
  assert.equal(saved.json().rev, 2)
  const stored = await templates().find(template.id)
  assert.equal(stored?.rev, 2)
  assert.equal(stored?.doc.bands.header.blocks.find((b) => b.id === 'issuer')?.props.align, 'right')
})

test('saving from a stale revision is refused and changes nothing', async () => {
  const template = await newTemplate('conflictiva')
  const first = addBlock(template.doc, 'summary', 'box')
  await harness.action('/templates/_action/save', { id: template.id, doc: first.doc, rev: 1 })

  const second = addBlock(template.doc, 'summary', 'line')
  const stale = await harness.action('/templates/_action/save', {
    id: template.id,
    doc: second.doc,
    rev: 1,
  })

  assert.equal(stale.status, 409)
  const stored = await templates().find(template.id)
  assert.equal(stored?.rev, 2)
  const ids = stored?.doc.bands.summary.blocks.map((block) => block.id) ?? []
  assert.ok(ids.includes(first.blockId))
  assert.equal(ids.includes(second.blockId), false)
})

test('an invalid document is refused and names what is wrong', async () => {
  const template = await newTemplate('invalida')
  const broken = structuredClone(template.doc)
  broken.bands.header.blocks[0].kind = 'qr'

  const response = await harness.action('/templates/_action/save', {
    id: template.id,
    doc: broken,
    rev: 1,
  })

  assert.equal(response.status, 400)
  assert.match(response.text, /qr/)
  const stored = await templates().find(template.id)
  assert.equal(stored?.rev, 1)
})

test('an unknown template answers a readable 404', async () => {
  const page = await harness.get('/templates/does-not-exist')

  assert.equal(page.status, 404)
  assert.match(page.text, /Esa plantilla no existe/)
})

test('saving an unknown template does not create one', async () => {
  const response = await harness.action('/templates/_action/save', {
    id: 'ghost',
    doc: emptyDocument(),
    rev: 1,
  })

  assert.notEqual(response.status, 200)
  assert.equal(await templates().find('ghost'), null)
})

test('a realistic document fits well inside the 100 kb action body limit', async () => {
  let doc = invoiceDocumentFixture()
  for (let index = 0; index < 40; index += 1) {
    doc = addBlock(doc, 'header', 'text').doc
  }

  const bytes = Buffer.byteLength(JSON.stringify({ id: 'x', doc, rev: 1 }), 'utf8')

  assert.ok(bytes < 100 * 1024, `payload is ${bytes} bytes`)
  assert.ok(JSON.stringify(doc).includes('@text'))
  assert.equal(JSON.stringify(doc).includes('base64'), false)
})

test('no view of the editor is ever a static page', () => {
  const views = container
    .resolve(UiControllerMetadataStore)
    .getControllerViewsInfo(TemplateController)

  assert.equal(views.length, 2)
  for (const info of views) {
    assert.equal(info.config?.static, undefined)
  }
})

test('creating a template from a preset stores that design, not a blank page', async () => {
  const preset = TEMPLATE_PRESETS[0]

  await harness.action('/templates/_action/create', { name: 'Con diseño', preset: preset.id })

  const stored = await templates().findOneByName('Con diseño')
  assert.ok(stored)
  assert.deepEqual(stored.doc, preset.build())
  assert.ok(stored.doc.bands.header.blocks.length > 0)
})

test('creating a template from an unknown preset is rejected', async () => {
  const response = await harness.action('/templates/_action/create', {
    name: 'Inventada',
    preset: 'no-existe',
  })

  assert.equal(response.status, 400)
  assert.equal(await templates().findOneByName('Inventada'), null)
})

test('creating a template without a preset still starts blank', async () => {
  await harness.action('/templates/_action/create', { name: 'En blanco' })

  const stored = await templates().findOneByName('En blanco')
  assert.ok(stored)
  assert.deepEqual(stored.doc, emptyDocument())
})
