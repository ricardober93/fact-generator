import assert from 'node:assert/strict'
import test from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { assetsFor, referencedAssetTokens } from './embedAssets'
import type { Asset } from './models/asset/Asset'
import { AssetRepository } from './models/asset/AssetRepository'
import { invoiceDocumentFixture } from './render/__fixtures__/invoiceDocument'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

function repo(): AssetRepository {
  return container.resolve(AssetRepository)
}

function pngPayload(fill: number): string {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([signature, Buffer.alloc(16, fill)]).toString('base64')
}

function spyOnReads(): string[][] {
  const repository = repo()
  const requested: string[][] = []
  const original = repository.findByIds.bind(repository)
  repository.findByIds = async (ids: string[]): Promise<Asset[]> => {
    requested.push(ids)
    return original(ids)
  }
  return requested
}

test('only the referenced asset is read, even with others in the database', async () => {
  const logo = await repo().upload(pngPayload(1))
  await repo().upload(pngPayload(2))
  await repo().upload(pngPayload(3))
  await repo().upload(pngPayload(4))
  const doc = invoiceDocumentFixture()
  doc.theme.logo = logo.id
  const requested = spyOnReads()

  const assets = await assetsFor(doc, repo())

  assert.deepEqual(Object.keys(assets), ['logo'])
  assert.match(assets.logo, /^data:image\/png;base64,/)
  assert.deepEqual(requested, [[logo.id]])
})

test('an asset that no longer exists is skipped without failing', async () => {
  const doc = invoiceDocumentFixture()
  doc.theme.logo = 'deleted-asset-id'

  assert.deepEqual(await assetsFor(doc, repo()), {})
})

test('a document that references no asset reads nothing', async () => {
  const doc = invoiceDocumentFixture()
  doc.bands.header.blocks = doc.bands.header.blocks.filter((block) => block.kind !== 'image')
  const requested = spyOnReads()

  assert.deepEqual(await assetsFor(doc, repo()), {})
  assert.deepEqual(requested, [])
  assert.deepEqual(referencedAssetTokens(doc), [])
})

test('the tokens come from the block schema, not from a hardcoded name', async () => {
  const doc = invoiceDocumentFixture()

  assert.deepEqual(referencedAssetTokens(doc), ['logo'])
})
