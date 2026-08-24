import assert from 'node:assert/strict'
import test from 'node:test'
import { Auth, container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import type { ISession } from '../auth/session'
import { ArticleRepository } from './models/ArticleRepository'
import { Stock } from './Stock'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

const ACME = 'empresa-acme'

function articles(): ArticleRepository {
  return container.resolve(ArticleRepository)
}

function stock(): Stock {
  return container.resolve(Stock)
}

function signIn(email: string, userId: string): void {
  const auth = container.resolve<Auth<ISession>>(Auth)
  if (auth.isAssigned()) auth.clear()
  auth.assign({ email, userId, role: 'administrador', companyId: ACME })
}

async function anArticle(code: string) {
  return articles().createArticle({
    companyId: ACME,
    code,
    name: `Artículo ${code}`,
    unitPrice: 10,
    taxRate: 19,
  })
}

test('a new article starts at zero with no movements', async () => {
  const article = await anArticle('S-1')

  assert.equal(article.stock, 0)
  assert.deepEqual(await stock().movementsOf(ACME, article.id), [])
})

test('adjusting changes the quantity and leaves a movement', async () => {
  const article = await anArticle('S-2')

  await stock().adjust({ companyId: ACME, articleId: article.id, delta: 10, reason: 'inventario' })

  const stored = await articles().findFor(ACME, article.id)
  const movements = await stock().movementsOf(ACME, article.id)
  assert.equal(stored?.stock, 10)
  assert.equal(movements.length, 1)
  assert.equal(movements[0]?.delta, 10)
})

test('the ledger explains the quantity', async () => {
  const article = await anArticle('S-3')

  await stock().adjust({ companyId: ACME, articleId: article.id, delta: 7, reason: 'entrada' })
  await stock().adjust({ companyId: ACME, articleId: article.id, delta: -3, reason: 'merma' })

  const stored = await articles().findFor(ACME, article.id)
  const movements = await stock().movementsOf(ACME, article.id)
  const sum = movements.reduce((total, movement) => total + movement.delta, 0)
  assert.equal(sum, stored?.stock)
  assert.equal(sum, 4)
})

test('without a reason there is no adjustment and the quantity stays', async () => {
  const article = await anArticle('S-4')

  await assert.rejects(
    () => stock().adjust({ companyId: ACME, articleId: article.id, delta: 5, reason: '   ' }),
    /reason/,
  )

  const stored = await articles().findFor(ACME, article.id)
  assert.equal(stored?.stock, 0)
  assert.deepEqual(await stock().movementsOf(ACME, article.id), [])
})

test('the reason is stored as given', async () => {
  const article = await anArticle('S-5')

  await stock().adjust({
    companyId: ACME,
    articleId: article.id,
    delta: 2,
    reason: 'rotura en almacén',
  })

  const movements = await stock().movementsOf(ACME, article.id)
  assert.equal(movements[0]?.reason, 'rotura en almacén')
})

test('the movement keeps who and when', async () => {
  const article = await anArticle('S-6')

  signIn('cajera@example.com', 'u-7')

  await stock().adjust({
    companyId: ACME,
    articleId: article.id,
    delta: 1,
    reason: 'conteo',
    at: Date.UTC(2026, 5, 15),
  })

  const movements = await stock().movementsOf(ACME, article.id)
  assert.equal(movements[0]?.at, Date.UTC(2026, 5, 15))
  assert.equal(movements[0]?.by.name, 'cajera@example.com')
  assert.equal(movements[0]?.by.userId, 'u-7')
})

test('adjusting an article of another company is refused', async () => {
  const article = await anArticle('S-7')

  await assert.rejects(() =>
    stock().adjust({ companyId: 'empresa-otra', articleId: article.id, delta: 1, reason: 'x' }),
  )
})

test('the author does not change afterwards', async () => {
  const article = await anArticle('S-8')
  signIn('antes@example.com', 'u-8')

  await stock().adjust({ companyId: ACME, articleId: article.id, delta: 1, reason: 'conteo' })

  signIn('despues@example.com', 'u-8')

  const movements = await stock().movementsOf(ACME, article.id)
  assert.equal(movements[0]?.by.name, 'antes@example.com')
})
