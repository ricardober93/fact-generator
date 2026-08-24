import assert from 'node:assert/strict'
import test from 'node:test'
import { container } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { ArticleRepository } from './ArticleRepository'
import type { IArticleInput } from './Article'

useMemoryRepositories()

const ACME = 'empresa-acme'
const OTRA = 'empresa-otra'

function articles(): ArticleRepository {
  return container.resolve(ArticleRepository)
}

function input(overrides: Partial<IArticleInput> = {}): IArticleInput {
  return {
    companyId: ACME,
    code: 'A-1',
    name: 'Teclado mecánico',
    unitPrice: 120,
    taxRate: 19,
    ...overrides,
  }
}

test('an article is created with its four fields', async () => {
  const created = await articles().createArticle(input({ code: 'C-1' }))

  assert.equal(created.code, 'C-1')
  assert.equal(created.name, 'Teclado mecánico')
  assert.equal(created.unitPrice, 120)
  assert.equal(created.taxRate, 19)
})

test('an article without a code is refused', async () => {
  await assert.rejects(() => articles().createArticle(input({ code: '  ' })), /code/)
})

test('an article without a name is refused', async () => {
  await assert.rejects(() => articles().createArticle(input({ code: 'C-2', name: '' })), /name/)
})

test('an article without a company is refused', async () => {
  await assert.rejects(
    () => articles().createArticle(input({ code: 'C-3', companyId: '' })),
    /company/,
  )
})

test('a negative price is refused', async () => {
  await assert.rejects(
    () => articles().createArticle(input({ code: 'C-4', unitPrice: -1 })),
    /price/,
  )
})

test('search finds by code and by name', async () => {
  await articles().createArticle(input({ code: 'ZX-9', name: 'Cable HDMI' }))
  await articles().createArticle(input({ code: 'QQ-1', name: 'Adaptador zx' }))

  const found = await articles().search(ACME, 'zx')

  assert.deepEqual(found.map((article) => article.code).sort(), ['QQ-1', 'ZX-9'])
})

test('a search with no matches returns empty and is not an error', async () => {
  const found = await articles().search(ACME, 'no-existe-nada-asi')

  assert.deepEqual(found, [])
})

test('the listing only brings the articles of the active company', async () => {
  await articles().createArticle(input({ code: 'MINE-1' }))
  await articles().createArticle(input({ code: 'THEIRS-1', companyId: OTRA }))

  const mine = await articles().findAllFor(ACME)
  const theirs = await articles().findAllFor(OTRA)

  assert.equal(
    mine.some((article) => article.code === 'THEIRS-1'),
    false,
  )
  assert.equal(
    theirs.some((article) => article.code === 'MINE-1'),
    false,
  )
})

test('an article of another company does not exist', async () => {
  const theirs = await articles().createArticle(input({ code: 'HIDDEN-1', companyId: OTRA }))

  assert.equal(await articles().findFor(ACME, theirs.id), null)
  assert.notEqual(await articles().findFor(OTRA, theirs.id), null)
})

test('the same code in another company is accepted', async () => {
  await articles().createArticle(input({ code: 'SHARED-1' }))
  const theirs = await articles().createArticle(input({ code: 'SHARED-1', companyId: OTRA }))

  assert.equal(theirs.code, 'SHARED-1')
  assert.equal((await articles().findAllFor(ACME)).filter((a) => a.code === 'SHARED-1').length, 1)
})

test('searching another company finds nothing of ours', async () => {
  await articles().createArticle(input({ code: 'SECRET-1', name: 'Sólo de acme' }))

  const found = await articles().search(OTRA, 'Sólo de acme')

  assert.deepEqual(found, [])
})

test('saving an article of another company is refused', async () => {
  const theirs = await articles().createArticle(input({ code: 'LOCK-1', companyId: OTRA }))

  await assert.rejects(() => articles().saveArticle(ACME, theirs.id, input({ code: 'LOCK-2' })))
})
