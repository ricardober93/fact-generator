import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { JwtConfig } from '@wabot-dev/framework'
import { action, h, uiController, view, type VNode } from '@wabot-dev/framework/ui'
import { createUiHarness, TestJwt, type UiHarness } from '@wabot-dev/framework/testing'
import { RequireSession } from './RequireSession'

@uiController({ path: '/guarded', middlewares: [RequireSession] })
class GuardedController {
  @view({ path: 'secret', title: 'Secreto' })
  secret(): VNode {
    return h('p', null, 'el tesoro')
  }

  @action()
  keep(): { saved: boolean } {
    return { saved: true }
  }
}

const testJwt = new TestJwt()

let harness: UiHarness

before(async () => {
  harness = await createUiHarness({
    controllers: [GuardedController],
    register: [[JwtConfig, testJwt.config]],
  })
})

after(async () => {
  await harness.close()
})

function cookie(token: string): Record<string, string> {
  return { Cookie: `${testJwt.config.cookieName}=${token}` }
}

test('without a cookie a view redirects to the login, keeping the destination', async () => {
  const page = await harness.get('/guarded/secret', { redirect: 'manual' })

  assert.equal(page.status, 302)
  assert.equal(page.headers.get('location'), '/login?next=%2Fguarded%2Fsecret')
  assert.equal(page.text.includes('el tesoro'), false)
})

test('the destination keeps its query string', async () => {
  const page = await harness.get('/guarded/secret', {
    query: { tab: 'design' },
    redirect: 'manual',
  })

  assert.equal(page.headers.get('location'), '/login?next=%2Fguarded%2Fsecret%3Ftab%3Ddesign')
})

test('with a valid cookie the view is served', async () => {
  const page = await harness.get('/guarded/secret', {
    headers: cookie(testJwt.sign({ email: 'operador@example.com' })),
  })

  assert.equal(page.status, 200)
  assert.match(page.text, /el tesoro/)
})

test('a cookie signed with another secret is treated as anonymous', async () => {
  const page = await harness.get('/guarded/secret', {
    headers: cookie(testJwt.signInvalid({ email: 'intruso@example.com' })),
    redirect: 'manual',
  })

  assert.equal(page.status, 302)
  assert.equal(page.text.includes('el tesoro'), false)
})

test('an unguessable cookie value is treated as anonymous', async () => {
  const page = await harness.get('/guarded/secret', {
    headers: cookie('no-es-un-token'),
    redirect: 'manual',
  })

  assert.equal(page.status, 302)
})

test('an action without a session answers 401 json, not a redirect', async () => {
  const response = await harness.action('/guarded/_action/keep', {}, { redirect: 'manual' })

  assert.equal(response.status, 401)
  assert.match(response.json().error.message, /sesión/i)
})

test('an action with a valid cookie runs', async () => {
  const response = await harness.action(
    '/guarded/_action/keep',
    {},
    { headers: cookie(testJwt.sign({ email: 'operador@example.com' })) },
  )

  assert.equal(response.status, 200)
  assert.equal(response.json().saved, true)
})
