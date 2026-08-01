import assert from 'node:assert/strict'
import test from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { createAsyncHarness, useMemoryRepositories } from '@wabot-dev/framework/testing'
import { invoiceDocumentFixture } from '../../render/__fixtures__/invoiceDocument'
import { INVOICE_DATA, INVOICE_ITEMS } from '../../render/__fixtures__/renderToHtml'
import { TemplateRepository } from '../template/TemplateRepository'
import { ExpireHandoffs } from './ExpireHandoffs'
import type { Handoff, IHandoffRecord } from './Handoff'
import { HandoffRepository } from './HandoffRepository'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

const DATA = INVOICE_DATA as unknown as IHandoffRecord
const ITEMS = INVOICE_ITEMS as unknown as IHandoffRecord[]

function repo(): HandoffRepository {
  return container.resolve(HandoffRepository)
}

async function expiredHandoff(templateId: string): Promise<Handoff> {
  const handoff = await repo().createHandoff(templateId, DATA, ITEMS)
  handoff.update({ expiresAt: Date.now() - 1000 })
  await repo().update(handoff)
  return handoff
}

test('the cron drops expired handoffs and leaves the live one alone', async () => {
  const template = await container
    .resolve(TemplateRepository)
    .createTemplate('cron', invoiceDocumentFixture())
  const firstExpired = await expiredHandoff(template.id)
  const secondExpired = await expiredHandoff(template.id)
  const live = await repo().createHandoff(template.id, DATA, ITEMS)

  await createAsyncHarness().runCron(ExpireHandoffs)

  assert.equal(await repo().findOneByToken(firstExpired.token), null)
  assert.equal(await repo().findOneByToken(secondExpired.token), null)
  assert.ok(await repo().findOneByToken(live.token))
})
