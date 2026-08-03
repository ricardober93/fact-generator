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

test('the configured credentials open the session', () => {
  withEnv({ AUTH_EMAIL: EMAIL, AUTH_PASSWORD: PASSWORD }, () => {
    assert.equal(credentials().matches(EMAIL, PASSWORD), true)
  })
})

test('the email is matched case insensitively and trimmed', () => {
  withEnv({ AUTH_EMAIL: EMAIL, AUTH_PASSWORD: PASSWORD }, () => {
    assert.equal(credentials().matches('  OPERADOR@Example.COM ', PASSWORD), true)
  })
})

test('a wrong password is rejected', () => {
  withEnv({ AUTH_EMAIL: EMAIL, AUTH_PASSWORD: PASSWORD }, () => {
    assert.equal(credentials().matches(EMAIL, 'otra-cosa'), false)
  })
})

test('an unknown email is rejected even with the right password', () => {
  withEnv({ AUTH_EMAIL: EMAIL, AUTH_PASSWORD: PASSWORD }, () => {
    assert.equal(credentials().matches('otro@example.com', PASSWORD), false)
  })
})

test('rubbish arguments are rejected', () => {
  withEnv({ AUTH_EMAIL: EMAIL, AUTH_PASSWORD: PASSWORD }, () => {
    const subject = credentials()

    assert.equal(subject.matches(undefined, PASSWORD), false)
    assert.equal(subject.matches(EMAIL, undefined), false)
  })
})

test('the plain password does not survive the constructor', () => {
  withEnv({ AUTH_EMAIL: EMAIL, AUTH_PASSWORD: PASSWORD }, () => {
    const subject = credentials()

    assert.equal(JSON.stringify(subject).includes(PASSWORD), false)
    assert.equal(
      Object.values(subject).some((value) => value === PASSWORD),
      false,
    )
  })
})

test('a missing variable stops the application from starting', () => {
  withEnv({ AUTH_EMAIL: undefined, AUTH_PASSWORD: PASSWORD }, () => {
    assert.throws(() => credentials(), /AUTH_EMAIL/)
  })
  withEnv({ AUTH_EMAIL: EMAIL, AUTH_PASSWORD: undefined }, () => {
    assert.throws(() => credentials(), /AUTH_PASSWORD/)
  })
})

test('a blank variable counts as missing', () => {
  withEnv({ AUTH_EMAIL: '   ', AUTH_PASSWORD: PASSWORD }, () => {
    assert.throws(() => credentials(), /AUTH_EMAIL/)
  })
})
