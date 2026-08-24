import assert from 'node:assert/strict'
import test from 'node:test'
import { container, Env } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { ArticleRepository } from '../inventory/app'
import { CatalogSource } from './CatalogSource'
import { HttpCatalogSource } from './HttpCatalogSource'
import { LocalCatalogSource } from './LocalCatalogSource'

useMemoryRepositories()

const ACME = 'empresa-acme'
const OTRA = 'empresa-otra'

function articles(): ArticleRepository {
  return container.resolve(ArticleRepository)
}

function sourceWith(url: string): CatalogSource {
  process.env.CATALOG_URL = url
  return new CatalogSource(new HttpCatalogSource(new Env()), container.resolve(LocalCatalogSource))
}

async function anArticle(companyId: string, code: string, name: string) {
  return articles().createArticle({ companyId, code, name, unitPrice: 30, taxRate: 19 })
}

test('with no variable and no local catalog there is no source and no results', async () => {
  const source = sourceWith('')

  assert.deepEqual(await source.search('empresa-vacia', 'lo que sea'), [])
  assert.equal(await source.findByRef('empresa-vacia', 'sku:1'), null)
})

test('with no variable the local catalog serves the selector', async () => {
  await anArticle(ACME, 'L-1', 'Lámpara de escritorio')
  const source = sourceWith('')

  assert.equal(source.available, true)

  const found = await source.search(ACME, 'lámpara')
  assert.equal(found.length, 1)
  assert.equal(found[0]?.label, 'Lámpara de escritorio')
  assert.equal(found[0]?.unitPrice, 30)
})

test('a local reference comes back character for character', async () => {
  const article = await anArticle(ACME, 'L-2', 'Cable de red')
  const source = sourceWith('')

  const found = await source.search(ACME, 'Cable de red')
  const byRef = await source.findByRef(ACME, found[0]?.ref ?? '')

  assert.equal(found[0]?.ref, article.id)
  assert.equal(byRef?.ref, article.id)
})

test('the local catalog filters by company', async () => {
  await anArticle(ACME, 'L-3', 'Sólo de acme')
  const source = sourceWith('')

  assert.deepEqual(await source.search(OTRA, 'Sólo de acme'), [])
  assert.equal(await source.findByRef(OTRA, 'L-3'), null)
})

test('the variable wins over the local catalog', async () => {
  await anArticle(ACME, 'L-4', 'Nunca deberia salir')
  const source = sourceWith('http://127.0.0.1:1/nothing-here')

  const found = await source.search(ACME, 'Nunca deberia salir')

  assert.deepEqual(found, [])
})
