import assert from 'node:assert/strict'
import test from 'node:test'
import { Env } from '@wabot-dev/framework'
import { AuthCredentials } from './AuthCredentials'

const EMAIL = 'operador@example.com'
const PASSWORD = 'una-contraseña-larga'

function withEnv(values: Record<string, string | undefined>, run: () => void): void {
  const previous = { AUTH_EMAIL: process.env.AUTH_EMAIL, AUTH_PASSWORD: process.env.AUTH_PASSWORD }
  Object.assign(process.env, values)
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[name]
  }
  try {
    run()
  } finally {
    Object.assign(process.env, previous)
  }
}

function credentials(): AuthCredentials {
  return new AuthCredentials(new Env())
}

test('the seed reads the two variables from the environment', () => {
  withEnv({ AUTH_EMAIL: EMAIL, AUTH_PASSWORD: PASSWORD }, () => {
    const seed = credentials()

    assert.equal(seed.email, EMAIL)
    assert.equal(seed.password, PASSWORD)
  })
})

test('the email is normalised, so the case of the first boot does not matter', () => {
  withEnv({ AUTH_EMAIL: 'Operador@Example.COM', AUTH_PASSWORD: PASSWORD }, () => {
    assert.equal(credentials().email, EMAIL)
  })
})

test('without either variable the application refuses to start', () => {
  withEnv({ AUTH_EMAIL: undefined, AUTH_PASSWORD: PASSWORD }, () => {
    assert.throws(() => credentials(), /AUTH_EMAIL/)
  })
  withEnv({ AUTH_EMAIL: EMAIL, AUTH_PASSWORD: undefined }, () => {
    assert.throws(() => credentials(), /AUTH_PASSWORD/)
  })
})

test('an empty variable counts as absent', () => {
  withEnv({ AUTH_EMAIL: EMAIL, AUTH_PASSWORD: '   ' }, () => {
    assert.throws(() => credentials())
  })
})
