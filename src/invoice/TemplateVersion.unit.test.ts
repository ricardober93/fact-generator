import assert from 'node:assert/strict'
import test, { before } from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { revisionOf } from './TemplateController'
import { AssetRepository } from './models/asset/AssetRepository'
import { TemplateRepository } from './models/template/TemplateRepository'
import { invoiceDocumentFixture } from './render/__fixtures__/invoiceDocument'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

const RED_DOT_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const BLUE_DOT_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

let templateId = ''

function templates(): TemplateRepository {
  return container.resolve(TemplateRepository)
}

function assets(): AssetRepository {
  return container.resolve(AssetRepository)
}

before(async () => {
  const template = await templates().createTemplate('Base', invoiceDocumentFixture())
  templateId = template.id
})

test('an unchanged template keeps the same key', async () => {
  const first = await revisionOf({ id: templateId })
  const second = await revisionOf({ id: templateId })

  assert.equal(first, second)
})

test('editing the document changes the key', async () => {
  const before = await revisionOf({ id: templateId })
  const template = await templates().find(templateId)

  const edited = invoiceDocumentFixture()
  edited.theme = { ...edited.theme, primary: '#abcdef' }
  await templates().saveDocument(templateId, edited, template!.rev)

  assert.notEqual(await revisionOf({ id: templateId }), before)
})

test('uploading a new image changes the key, because the editor offers it', async () => {
  await assets().upload(RED_DOT_PNG)
  const before = await revisionOf({ id: templateId })

  await assets().upload(BLUE_DOT_PNG)

  assert.notEqual(await revisionOf({ id: templateId }), before)
})

test('uploading the same image twice does not change the key', async () => {
  await assets().upload(RED_DOT_PNG)
  const before = await revisionOf({ id: templateId })

  await assets().upload(RED_DOT_PNG)

  assert.equal(await revisionOf({ id: templateId }), before)
})

test('a template that does not exist still yields a key instead of throwing', async () => {
  const key = await revisionOf({ id: 'no-existe' })

  assert.equal(typeof key, 'string')
  assert.ok(key.length > 0)
})
