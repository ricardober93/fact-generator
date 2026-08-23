import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { container } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { createSignedInHarness, type ISignedInHarness } from '../auth/__fixtures__/signedIn'
import { CompanyController } from './CompanyController'
import { CompanyRepository } from './models/CompanyRepository'

useMemoryRepositories()

let harness: ISignedInHarness

function companies(): CompanyRepository {
  return container.resolve(CompanyRepository)
}

before(async () => {
  harness = await createSignedInHarness([CompanyController])
})

after(async () => await harness.close())

test('without a company the page says so and offers to create it', async () => {
  const page = await harness.get('/company')

  assert.equal(page.status, 200)
  assert.match(page.text, /data-no-company="true"/)
  assert.match(page.text, /Crear empresa/)
})

test('creating the company from the form leaves it as the current one', async () => {
  await harness.action(
    '/company/_action/save',
    { nit: '900123456-7', name: 'Acme S.A.S.', address: 'Calle 1' },
    { redirect: 'manual' },
  )

  const current = await companies().current()
  assert.equal(current?.nit, '900123456-7')
  assert.equal(current?.name, 'Acme S.A.S.')
})

test('with a company the page shows it and offers to save, not to create', async () => {
  const page = await harness.get('/company')

  assert.equal(page.text.includes('data-no-company="true"'), false)
  assert.match(page.text, /Acme S\.A\.S\./)
  assert.match(page.text, /900123456-7/)
})

test('saving changes what it says without creating a second one', async () => {
  const before = (await companies().findAll()).length
  const current = await companies().current()

  await harness.action(
    '/company/_action/save',
    { id: current?.id, nit: '900123456-7', name: 'Acme S.A.' },
    { redirect: 'manual' },
  )

  assert.equal((await companies().findAll()).length, before)
  assert.equal((await companies().current())?.name, 'Acme S.A.')
})

test('a company without a NIT is refused', async () => {
  const response = await harness.action(
    '/company/_action/save',
    { nit: '', name: 'Sin NIT' },
    { redirect: 'manual' },
  )

  assert.ok(response.status >= 400)
})
