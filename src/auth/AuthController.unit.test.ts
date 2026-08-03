import assert from 'node:assert/strict'
import test, { after, before, beforeEach } from 'node:test'
import { container, JwtConfig } from '@wabot-dev/framework'
import { UiControllerMetadataStore } from '@wabot-dev/framework/ui'
import { createUiHarness, TestJwt, type UiHarness } from '@wabot-dev/framework/testing'
import { AuthController } from './AuthController'
import { LoginAttempts, MAX_FAILED_ATTEMPTS } from './LoginAttempts'

const EMAIL = 'operador@example.com'
const PASSWORD = 'una-contraseña-larga'

process.env.AUTH_EMAIL = EMAIL
process.env.AUTH_PASSWORD = PASSWORD

const testJwt = new TestJwt()

let harness: UiHarness

before(async () => {
  harness = await createUiHarness({
    controllers: [AuthController],
    register: [[JwtConfig, testJwt.config]],
  })
})

after(async () => {
  await harness.close()
})

beforeEach(() => {
  container.resolve(LoginAttempts).registerSuccess('::ffff:127.0.0.1')
  container.resolve(LoginAttempts).registerSuccess('::1')
  container.resolve(LoginAttempts).registerSuccess('127.0.0.1')
})

function signIn(body: Record<string, string>) {
  return harness.action('/login/_action/signIn', body, { redirect: 'manual' })
}

function sessionCookieOf(response: { headers: Headers }): string {
  return response.headers.get('set-cookie') ?? ''
}

test('the login page is public and offers a plain form', async () => {
  const page = await harness.get('/login')

  assert.equal(page.status, 200)
  assert.match(page.text, /name="email"/)
  assert.match(page.text, /name="password"/)
  assert.match(page.text, /action="\/login\/_action\/signIn"/)
  assert.match(page.text, /method="post"/)
})

test('the login page ships no island, so it works without javascript', async () => {
  const page = await harness.get('/login')

  assert.equal(page.text.includes('<wabot-island'), false)
})

test('the login view is never a static page', () => {
  const views = container.resolve(UiControllerMetadataStore).getControllerViewsInfo(AuthController)

  assert.equal(views.length, 1)
  assert.equal(views[0].config?.static, undefined)
})

test('the right credentials open the session and go to the destination', async () => {
  const response = await signIn({ email: EMAIL, password: PASSWORD, next: '/invoices/42' })

  assert.equal(response.status, 302)
  assert.equal(response.headers.get('location'), '/invoices/42')
  assert.match(sessionCookieOf(response), /HttpOnly/i)
  assert.match(sessionCookieOf(response), /SameSite=Lax/i)
})

test('with no destination it lands on the invoice list', async () => {
  const response = await signIn({ email: EMAIL, password: PASSWORD })

  assert.equal(response.headers.get('location'), '/invoices')
})

test('an external destination is discarded', async () => {
  const response = await signIn({
    email: EMAIL,
    password: PASSWORD,
    next: 'https://malo.example',
  })

  assert.equal(response.headers.get('location'), '/invoices')
})

test('a wrong password does not open a session and says so on the way back', async () => {
  const response = await signIn({ email: EMAIL, password: 'otra-cosa' })

  assert.equal(response.status, 302)
  assert.equal(sessionCookieOf(response).includes(testJwt.config.cookieName), false)

  const back = await harness.get(response.headers.get('location') ?? '/login')

  assert.match(back.text, /data-login-error="true"/)
  assert.match(back.text, /No hemos podido entrar/)
})

test('an unknown email says exactly the same as a wrong password', async () => {
  const unknownEmail = await signIn({ email: 'otro@example.com', password: PASSWORD })
  const wrongPassword = await signIn({ email: EMAIL, password: 'otra-cosa' })

  assert.equal(unknownEmail.headers.get('location'), wrongPassword.headers.get('location'))
})

test('a failed attempt never reflects the password back', async () => {
  const secret = 'contraseña-inventada-9182'

  const response = await signIn({ email: EMAIL, password: secret })
  const back = await harness.get(response.headers.get('location') ?? '/login')

  assert.equal(response.text.includes(secret), false)
  assert.equal(back.text.includes(secret), false)
})

test('too many failures block even the right credentials', async () => {
  for (let attempt = 0; attempt < MAX_FAILED_ATTEMPTS; attempt += 1) {
    await signIn({ email: EMAIL, password: 'otra-cosa' })
  }

  const response = await signIn({ email: EMAIL, password: PASSWORD })
  const back = await harness.get(response.headers.get('location') ?? '/login')

  assert.equal(response.status, 302)
  assert.equal(sessionCookieOf(response).includes(testJwt.config.cookieName), false)
  assert.match(back.text, /Demasiados intentos/)
})

test('signing out expires the cookie and returns to the login', async () => {
  const response = await harness.action('/login/_action/signOut', {}, { redirect: 'manual' })

  assert.equal(response.status, 302)
  assert.equal(response.headers.get('location'), '/login')
  assert.match(sessionCookieOf(response), /Expires=Thu, 01 Jan 1970/i)
})

test('with a session already open the login redirects instead of asking again', async () => {
  const page = await harness.get('/login', {
    headers: { Cookie: `${testJwt.config.cookieName}=${testJwt.sign({ email: EMAIL })}` },
    redirect: 'manual',
  })

  assert.equal(page.status, 302)
  assert.equal(page.headers.get('location'), '/invoices')
})
