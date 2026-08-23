import assert from 'node:assert/strict'
import test from 'node:test'
import { container } from '@wabot-dev/framework'
import { useMemoryRepositories } from '@wabot-dev/framework/testing'
import { UserRepository } from './UserRepository'

useMemoryRepositories()

function users(): UserRepository {
  return container.resolve(UserRepository)
}

const ANA = {
  email: 'Ana@Example.com',
  password: 'una-contraseña-larga',
  name: 'Ana',
  role: 'cajero' as const,
}

test('a user enters with what is theirs', async () => {
  await users().createUser(ANA)

  const found = await users().authenticate('ana@example.com', ANA.password)

  assert.equal(found?.name, 'Ana')
  assert.equal(found?.role, 'cajero')
})

test('the email is normalised, so the case never locks anybody out', async () => {
  const found = await users().authenticate('ANA@EXAMPLE.COM', ANA.password)

  assert.ok(found)
})

test('a wrong password does not enter', async () => {
  assert.equal(await users().authenticate('ana@example.com', 'otra'), null)
})

test('an unknown email does not enter', async () => {
  assert.equal(await users().authenticate('nadie@example.com', ANA.password), null)
})

test('the password is not stored in the clear', async () => {
  const stored = await users().findOneByEmail('ana@example.com')

  assert.equal(JSON.stringify(stored).includes(ANA.password), false)
})

test('two users do not share an email', async () => {
  await assert.rejects(() => users().createUser({ ...ANA, email: 'ana@example.com' }))
})

test('an unknown role is refused', async () => {
  await assert.rejects(() =>
    users().createUser({ ...ANA, email: 'otro@example.com', role: 'jefe' as never }),
  )
})

test('a disabled user stops entering', async () => {
  const user = await users().createUser({ ...ANA, email: 'baja@example.com' })
  user.disable()
  await users().update(user)

  assert.equal(await users().authenticate('baja@example.com', ANA.password), null)
})

test('membership is what says which companies somebody can operate in', async () => {
  const user = await users().createUser({
    ...ANA,
    email: 'dos@example.com',
    companyIds: ['empresa-1'],
  })

  assert.equal(user.belongsTo('empresa-1'), true)
  assert.equal(user.belongsTo('empresa-2'), false)

  user.join('empresa-2')

  assert.equal(user.belongsTo('empresa-2'), true)
})

test('the last administrator of a company is not demoted', async () => {
  const admin = await users().createUser({
    email: 'jefe@example.com',
    password: 'una-contraseña-larga',
    name: 'Jefe',
    role: 'administrador',
    companyIds: ['sola'],
  })

  const isLastAdmin = (error: unknown) => (error as { code?: string }).code === 'LAST_ADMIN'
  await assert.rejects(() => users().changeRole(admin.id, 'cajero', 'sola'), isLastAdmin)
  await assert.rejects(() => users().disableUser(admin.id, 'sola'), isLastAdmin)
  assert.equal((await users().findOrThrow(admin.id)).isAdmin, true)
})

test('with another administrator the change goes through', async () => {
  const first = await users().createUser({
    email: 'jefa1@example.com',
    password: 'una-contraseña-larga',
    name: 'Jefa uno',
    role: 'administrador',
    companyIds: ['dupla'],
  })
  await users().createUser({
    email: 'jefa2@example.com',
    password: 'una-contraseña-larga',
    name: 'Jefa dos',
    role: 'administrador',
    companyIds: ['dupla'],
  })

  const changed = await users().changeRole(first.id, 'cajero', 'dupla')

  assert.equal(changed.role, 'cajero')
})
