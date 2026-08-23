import assert from 'node:assert/strict'
import test from 'node:test'
import { container } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { CompanyRepository } from './CompanyRepository'

useMemoryRepositories()

function companies(): CompanyRepository {
  return container.resolve(CompanyRepository)
}

const ACME = { nit: '900123456-7', name: 'Acme S.A.S.', address: 'Calle 1 #2-3' }

test('a company is created with what identifies it', async () => {
  const created = await companies().createCompany(ACME)

  assert.equal(created.nit, '900123456-7')
  assert.equal(created.name, 'Acme S.A.S.')
  assert.equal(created.address, 'Calle 1 #2-3')
})

test('a company without a NIT or without a name is refused', async () => {
  await assert.rejects(() => companies().createCompany({ ...ACME, nit: '  ' }))
  await assert.rejects(() => companies().createCompany({ ...ACME, name: '' }))
})

test('the issuer fields are the ones a template can paint', async () => {
  const company = await companies().createCompany({ ...ACME, tagline: 'Cosas buenas' })

  assert.equal(company.issuerFields.nombre, 'Acme S.A.S.')
  assert.equal(company.issuerFields.nit, '900123456-7')
  assert.equal(company.issuerFields.eslogan, 'Cosas buenas')
  assert.equal(company.issuerFields.telefono, '')
})

test('saving a company changes what it says without changing which one is', async () => {
  const created = await companies().createCompany({ ...ACME, name: 'Antes S.A.' })

  const saved = await companies().saveCompany(created.id, { ...ACME, name: 'Después S.A.' })

  assert.equal(saved.id, created.id)
  assert.equal(saved.name, 'Después S.A.')
  assert.equal((await companies().findOrThrow(created.id)).name, 'Después S.A.')
})

test('saving a company that does not exist is refused', async () => {
  await assert.rejects(() => companies().saveCompany('no-existe', ACME))
})

test('the current company is the one there is', async () => {
  const current = await companies().current()

  assert.ok(current)
  assert.equal(current?.id, (await companies().findAll())[0]?.id)
})
