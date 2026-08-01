import assert from 'node:assert/strict'
import test from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { invoiceDocumentFixture } from '../../render/__fixtures__/invoiceDocument'
import { INVOICE_DATA, INVOICE_ITEMS } from '../../render/__fixtures__/renderToHtml'
import { TemplateRepository } from '../template/TemplateRepository'
import { HANDOFF_TTL_MS, type IHandoffRecord } from './Handoff'
import { HandoffRepository } from './HandoffRepository'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

function repo(): HandoffRepository {
  return container.resolve(HandoffRepository)
}

async function templateId(name: string): Promise<string> {
  const template = await container
    .resolve(TemplateRepository)
    .createTemplate(name, invoiceDocumentFixture())
  return template.id
}

const DATA = INVOICE_DATA as unknown as IHandoffRecord
const ITEMS = INVOICE_ITEMS as unknown as IHandoffRecord[]

test('a handoff round trips and is readable inside its window', async () => {
  const id = await templateId('window')

  const created = await repo().createHandoff(id, DATA, ITEMS, { color: '#ff0000' })
  const found = await repo().findValid(created.token, Date.now())

  assert.ok(found)
  assert.equal(found.templateId, id)
  assert.deepEqual(found.invoiceData, DATA)
  assert.deepEqual(found.invoiceItems, ITEMS)
  assert.deepEqual(found.params, { color: '#ff0000' })
  assert.ok(found.expiresAt - Date.now() <= HANDOFF_TTL_MS)
})

test('reading the same handoff three times gives the same data', async () => {
  const id = await templateId('repeat')
  const created = await repo().createHandoff(id, DATA, ITEMS)

  const reads = await Promise.all([
    repo().findValid(created.token, Date.now()),
    repo().findValid(created.token, Date.now()),
    repo().findValid(created.token, Date.now()),
  ])

  assert.equal(
    reads.filter((handoff) => handoff?.token === created.token).length,
    3,
    'every read inside the window must resolve',
  )
})

test('an expired handoff behaves exactly like an unknown token', async () => {
  const id = await templateId('expired')
  const created = await repo().createHandoff(id, DATA, ITEMS)
  const afterExpiry = Date.now() + HANDOFF_TTL_MS + 1

  assert.equal(await repo().findValid(created.token, afterExpiry), null)
  assert.equal(await repo().findValid('never-existed', Date.now()), null)
})

test('an unknown template is rejected and nothing is stored', async () => {
  await assert.rejects(
    () => repo().createHandoff('missing-template', DATA, ITEMS),
    /Unknown template/,
  )
})

test('incomplete data is rejected naming every missing path', async () => {
  const id = await templateId('incomplete')
  const incomplete = { cliente: { nombre: 'Ana' } } as unknown as IHandoffRecord

  await assert.rejects(
    () => repo().createHandoff(id, incomplete, ITEMS),
    (error: Error) => {
      assert.match(error.message, /emisor\.nombre/)
      assert.match(error.message, /factura\.numero/)
      return true
    },
  )
})

test('two consecutive tokens are not correlative', async () => {
  const id = await templateId('tokens')

  const first = await repo().createHandoff(id, DATA, ITEMS)
  const second = await repo().createHandoff(id, DATA, ITEMS)

  assert.notEqual(first.token, second.token)
  assert.equal(first.token.length, 32)
  assert.equal(second.token.length, 32)
})

test('the cleanup removes expired handoffs and keeps the live one', async () => {
  const id = await templateId('cleanup')
  const live = await repo().createHandoff(id, DATA, ITEMS)
  const expired = await repo().createHandoff(id, DATA, ITEMS)
  expired.update({ expiresAt: Date.now() - 1 })
  await repo().update(expired)

  await repo().deleteExpired(Date.now())

  assert.equal(await repo().findOneByToken(expired.token), null)
  assert.ok(await repo().findOneByToken(live.token))
})
