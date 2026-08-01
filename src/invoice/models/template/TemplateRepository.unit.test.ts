import assert from 'node:assert/strict'
import test from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { emptyDocument } from '../../render/document'
import { invoiceDocumentFixture } from '../../render/__fixtures__/invoiceDocument'
import type { Template } from './Template'
import { TemplateRepository } from './TemplateRepository'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

function repo(): TemplateRepository {
  return container.resolve(TemplateRepository)
}

function allTemplates(): Promise<Template[]> {
  return (repo() as unknown as { findAll(): Promise<Template[]> }).findAll()
}

test('a template round trips without losing its document', async () => {
  const doc = invoiceDocumentFixture()

  const created = await repo().createTemplate('Factura A', doc)
  const found = await repo().find(created.id)

  assert.ok(found)
  assert.equal(found.name, 'Factura A')
  assert.deepEqual(found.doc, doc)
  assert.equal(found.rev, 1)
})

test('an invalid document is never persisted', async () => {
  const doc = emptyDocument() as any
  delete doc.bands.summary

  await assert.rejects(() => repo().createTemplate('Rota', doc), /Invalid document/)
  assert.equal(await repo().findOneByName('Rota'), null)
})

test('a write on the current revision bumps rev by one', async () => {
  const created = await repo().createTemplate('Incremental', emptyDocument())

  const result = await repo().saveDocument(created.id, invoiceDocumentFixture(), created.rev)

  assert.equal(result.status, 'saved')
  assert.equal(result.template.rev, 2)
  assert.equal((await repo().findOrThrow(created.id)).rev, 2)
})

test('two editors on the same revision: the second one is rejected', async () => {
  const created = await repo().createTemplate('Concurrente', emptyDocument())
  const staleRev = created.rev

  const firstDoc = invoiceDocumentFixture()
  const first = await repo().saveDocument(created.id, firstDoc, staleRev)
  assert.equal(first.status, 'saved')

  const secondDoc = emptyDocument()
  secondDoc.theme.primary = '#ff0000'
  const second = await repo().saveDocument(created.id, secondDoc, staleRev)

  assert.equal(second.status, 'conflict')
  assert.equal(second.template.rev, 2)

  const stored = await repo().findOrThrow(created.id)
  assert.deepEqual(stored.doc, firstDoc)
  assert.equal(stored.rev, 2)
})

test('a conflict hands back the stored revision and document', async () => {
  const created = await repo().createTemplate('Conflicto', emptyDocument())
  await repo().saveDocument(created.id, invoiceDocumentFixture(), created.rev)

  const result = await repo().saveDocument(created.id, emptyDocument(), 1)

  assert.equal(result.status, 'conflict')
  assert.equal(result.template.rev, 2)
  assert.deepEqual(result.template.doc, invoiceDocumentFixture())
})

test('the revision cannot be forced by the caller', async () => {
  const created = await repo().createTemplate('Forzada', emptyDocument())

  assert.equal(created.rev, 1)

  const result = await repo().saveDocument(created.id, emptyDocument(), 1)

  assert.equal(result.status, 'saved')
  assert.equal(result.template.rev, 2)
})

test('an invalid document is rejected before the revision check', async () => {
  const created = await repo().createTemplate('Validada', emptyDocument())
  const broken = emptyDocument() as any
  broken.page.widthMm = 0

  await assert.rejects(
    () => repo().saveDocument(created.id, broken, created.rev),
    /Invalid document/,
  )
  assert.equal((await repo().findOrThrow(created.id)).rev, 1)
})

test('listing templates never returns image bytes', async () => {
  await repo().createTemplate('Con logo', invoiceDocumentFixture())

  const all = await allTemplates()
  const serialized = JSON.stringify(all.map((template) => template.doc))

  assert.equal(serialized.includes('base64'), false)
  assert.equal(serialized.includes('data:image'), false)
})
