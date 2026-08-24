import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { asRole, createSignedInHarness, type ISignedInHarness } from '../auth/__fixtures__/signedIn'
import { seedCompany } from '../company/__fixtures__/seededCompany'
import { ArticleController } from './ArticleController'
import { ArticleRepository } from './models/ArticleRepository'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

let harness: ISignedInHarness
let companyId = ''

before(async () => {
  companyId = await seedCompany()
  harness = await createSignedInHarness([ArticleController])
})

after(async () => {
  await harness.close()
})

function articles(): ArticleRepository {
  return container.resolve(ArticleRepository)
}

test('with no articles the page says so', async () => {
  const page = await harness.get('/articles')

  assert.equal(page.status, 200)
  assert.match(page.text, /Todavía no hay artículos/)
})

test('an administrator creates an article and it shows up', async () => {
  await harness.action('/articles/_action/create', {
    code: 'UI-1',
    name: 'Monitor curvo',
    unitPrice: '250',
    taxRate: '19',
  })

  const page = await harness.get('/articles')
  assert.match(page.text, /Monitor curvo/)
})

test('adjusting stock changes what the listing paints', async () => {
  const article = await articles().createArticle({
    companyId,
    code: 'UI-2',
    name: 'Teclado',
    unitPrice: 80,
    taxRate: 19,
  })

  await harness.action('/articles/_action/adjust', {
    id: article.id,
    delta: '12',
    reason: 'conteo inicial',
  })

  const page = await harness.get('/articles')
  assert.match(page.text, new RegExp(`data-article="${article.id}" data-stock="12"`))
})

test('a cashier sees the catalogue and cannot create', async () => {
  const page = await harness.get('/articles', asRole('cajero'))
  assert.equal(page.status, 200)

  const denied = await harness.action(
    '/articles/_action/create',
    { code: 'NO-1', name: 'Nope', unitPrice: '1', taxRate: '0' },
    asRole('cajero'),
  )

  assert.equal(denied.status >= 400, true)
  assert.deepEqual(
    (await articles().findAllFor(companyId)).filter((a) => a.code === 'NO-1'),
    [],
  )
})

test('read-only cannot adjust either', async () => {
  const article = await articles().createArticle({
    companyId,
    code: 'UI-3',
    name: 'Ratón',
    unitPrice: 20,
    taxRate: 19,
  })

  const denied = await harness.action(
    '/articles/_action/adjust',
    { id: article.id, delta: '5', reason: 'nope' },
    asRole('lectura'),
  )

  assert.equal(denied.status >= 400, true)
  assert.equal((await articles().findFor(companyId, article.id))?.stock, 0)
})

test('without a session it answers like any protected route', async () => {
  const page = await harness.anonymous.get('/articles', { redirect: 'manual' })

  assert.equal(page.status === 302 || page.status === 401, true)
})

test('an adjustment without a reason is refused by the server', async () => {
  const article = await articles().createArticle({
    companyId,
    code: 'UI-4',
    name: 'Altavoz',
    unitPrice: 60,
    taxRate: 19,
  })

  const denied = await harness.action('/articles/_action/adjust', {
    id: article.id,
    delta: '3',
    reason: '   ',
  })

  assert.equal(denied.status >= 400, true)
  assert.equal((await articles().findFor(companyId, article.id))?.stock, 0)
})
