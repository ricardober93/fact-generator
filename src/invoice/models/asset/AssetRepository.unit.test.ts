import assert from 'node:assert/strict'
import test from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import type { Asset } from './Asset'
import { AssetRepository, MAX_ASSET_BYTES } from './AssetRepository'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

function repo(): AssetRepository {
  return container.resolve(AssetRepository)
}

function allAssets(): Promise<Asset[]> {
  return (repo() as unknown as { findAll(): Promise<Asset[]> }).findAll()
}

function pngBytes(payloadSize = 16): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([signature, Buffer.alloc(payloadSize, 7)])
}

function base64Of(bytes: Buffer): string {
  return bytes.toString('base64')
}

test('a valid PNG is accepted and typed from its content', async () => {
  const asset = await repo().upload(base64Of(pngBytes()))

  assert.equal(asset.mime, 'image/png')
  assert.equal(asset.sizeBytes, 24)
  assert.match(asset.toDataUri(), /^data:image\/png;base64,/)
})

test('uploading the same image twice yields the same id and a single row', async () => {
  const payload = base64Of(pngBytes(32))

  const first = await repo().upload(payload)
  const second = await repo().upload(payload)

  assert.equal(first.id, second.id)
  assert.equal(first.contentHash, second.contentHash)

  const matching = (await allAssets()).filter((a) => a.contentHash === first.contentHash)
  assert.equal(matching.length, 1)
})

test('a data URI payload is accepted and normalised', async () => {
  const bytes = pngBytes(48)

  const fromRaw = await repo().upload(base64Of(bytes))
  const fromDataUri = await repo().upload(`data:image/png;base64,${base64Of(bytes)}`)

  assert.equal(fromRaw.id, fromDataUri.id)
})

test('content whose magic bytes are not allowed is rejected despite the declared type', async () => {
  const gif = Buffer.concat([Buffer.from('GIF89a', 'ascii'), Buffer.alloc(16, 1)])

  await assert.rejects(
    () => repo().upload(`data:image/png;base64,${base64Of(gif)}`),
    /not an allowed image format/,
  )
})

test('a JPEG is recognised by its signature', async () => {
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(16, 3)])

  const asset = await repo().upload(base64Of(jpeg))

  assert.equal(asset.mime, 'image/jpeg')
})

test('a WebP is recognised by its RIFF container', async () => {
  const webp = Buffer.concat([
    Buffer.from('RIFF', 'ascii'),
    Buffer.alloc(4, 0),
    Buffer.from('WEBP', 'ascii'),
    Buffer.alloc(16, 2),
  ])

  const asset = await repo().upload(base64Of(webp))

  assert.equal(asset.mime, 'image/webp')
})

test('an SVG carrying a script is stored but only ever served as a data URI', async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')

  const asset = await repo().upload(base64Of(svg))

  assert.equal(asset.mime, 'image/svg+xml')
  assert.match(asset.toDataUri(), /^data:image\/svg\+xml;base64,/)
  assert.equal('markup' in asset, false)
})

test('content above the server limit is rejected and not persisted', async () => {
  const oversized = pngBytes(MAX_ASSET_BYTES + 1)

  await assert.rejects(() => repo().upload(base64Of(oversized)), /exceeds 65536 bytes/)

  const stored = await allAssets()
  assert.equal(
    stored.some((a) => a.sizeBytes > MAX_ASSET_BYTES),
    false,
  )
})

test('an empty payload is rejected', async () => {
  await assert.rejects(() => repo().upload(''), /required/)
})
