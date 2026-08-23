import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { container, InMemoryLocker, Locker } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { CompanyController } from '../company/CompanyController'
import { seedCompany } from '../company/__fixtures__/seededCompany'
import { NumberRangeController } from '../numbering/app'
import { asRole, createSignedInHarness, type ISignedInHarness } from './__fixtures__/signedIn'

useMemoryRepositories()
container.register(Locker, { useToken: InMemoryLocker })

let harness: ISignedInHarness

before(async () => {
  await seedCompany()
  harness = await createSignedInHarness([CompanyController, NumberRangeController])
})

after(async () => await harness.close())

const RANGE = {
  series: 'factura',
  prefix: 'RG',
  from: '1',
  to: '99',
  validFrom: '2026-01-01',
  validTo: '2026-12-31',
}

test('a cashier does not touch the numbering', async () => {
  const response = await harness.action('/ranges/_action/create', RANGE, {
    ...asRole('cajero'),
    redirect: 'manual',
  })

  assert.equal(response.status, 403)
})

test('a read-only user does not touch it either', async () => {
  const response = await harness.action('/ranges/_action/create', RANGE, {
    ...asRole('lectura'),
    redirect: 'manual',
  })

  assert.equal(response.status, 403)
})

test('an administrator does', async () => {
  const response = await harness.action('/ranges/_action/create', RANGE, {
    ...asRole('administrador'),
    redirect: 'manual',
  })

  assert.notEqual(response.status, 403)
})

test('the refusal happens before anything is written', async () => {
  await harness.action(
    '/company/_action/save',
    { nit: '000', name: 'Intruso S.A.' },
    { ...asRole('cajero'), redirect: 'manual' },
  )

  const page = await harness.get('/company')
  assert.equal(page.text.includes('Intruso S.A.'), false)
})

test('everybody can look, whatever their role', async () => {
  for (const role of ['administrador', 'cajero', 'lectura'] as const) {
    const page = await harness.get('/ranges', asRole(role))
    assert.equal(page.status, 200)
  }
})
