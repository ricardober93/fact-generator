import assert from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import test, { after, before } from 'node:test'
import { Env } from '@wabot-dev/framework'
import { HttpCatalogSource } from './HttpCatalogSource'

let server: Server
let baseUrl = ''
let reply: { status: number; body: unknown; delayMs?: number } = { status: 200, body: [] }
let lastPath = ''

before(async () => {
  server = createServer((req, res) => {
    lastPath = req.url ?? ''
    const send = () => {
      res.writeHead(reply.status, { 'content-type': 'application/json' })
      res.end(typeof reply.body === 'string' ? reply.body : JSON.stringify(reply.body))
    }
    if (reply.delayMs) setTimeout(send, reply.delayMs)
    else send()
  })
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  baseUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`
})

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

function source(url = baseUrl): HttpCatalogSource {
  process.env.CATALOG_URL = url
  return new HttpCatalogSource(new Env())
}

const OWNER = 'empresa-1'

const ONE = { ref: 'sku:1', code: 'A-1', label: 'Producto uno', unitPrice: 25, taxRate: 19 }

test('without a configured source there is no source and no call', async () => {
  const offline = source('')

  assert.equal(offline.available, false)
  assert.deepEqual(await offline.search(OWNER, 'lo que sea'), [])
  assert.equal(await offline.findByRef(OWNER, 'sku:1'), null)
})

test('searching goes to the versioned route', async () => {
  reply = { status: 200, body: [ONE] }

  const found = await source().search(OWNER, 'uno')

  assert.match(lastPath, /^\/v1\/items\?q=uno$/)
  assert.deepEqual(found, [ONE])
})

test('fields the contract does not declare are ignored', async () => {
  reply = { status: 200, body: [{ ...ONE, categoria: 'x', proveedor: 'y', stock: 3 }] }

  assert.deepEqual(await source().search(OWNER, ''), [ONE])
})

test('an incomplete item is discarded and the rest survive', async () => {
  reply = { status: 200, body: [{ ref: 'sku:2', code: 'B' }, ONE, { label: 'sin ref' }] }

  assert.deepEqual(await source().search(OWNER, ''), [ONE])
})

test('a missing tax rate counts as zero, because plenty of things have none', async () => {
  reply = { status: 200, body: [{ ref: 'r', label: 'Servicio', unitPrice: 10 }] }

  const found = await source().search(OWNER, '')

  assert.equal(found[0]?.taxRate, 0)
})

test('one is fetched by its reference, url-encoded', async () => {
  reply = { status: 200, body: ONE }

  const found = await source().findByRef(OWNER, 'sku:1')

  assert.equal(lastPath, '/v1/items/sku%3A1')
  assert.deepEqual(found, ONE)
})

test('a source that answers with an error gives no results, not an exception', async () => {
  reply = { status: 500, body: { boom: true } }

  assert.deepEqual(await source().search(OWNER, 'uno'), [])
  assert.equal(await source().findByRef(OWNER, 'sku:1'), null)
})

test('a shape that does not fit is treated as no results', async () => {
  reply = { status: 200, body: { productos: [ONE] } }

  assert.deepEqual(await source().search(OWNER, 'uno'), [])
})

test('a body that is not even JSON does not break anything', async () => {
  reply = { status: 200, body: 'no soy json' }

  assert.deepEqual(await source().search(OWNER, 'uno'), [])
})

test('a source that is not there gives no results', async () => {
  assert.deepEqual(await source('http://127.0.0.1:1').search(OWNER, 'uno'), [])
})

test('a source that takes too long is abandoned', async () => {
  reply = { status: 200, body: [ONE], delayMs: 2500 }

  assert.deepEqual(await source().search(OWNER, 'uno'), [])
  reply = { status: 200, body: [], delayMs: 0 }
})
