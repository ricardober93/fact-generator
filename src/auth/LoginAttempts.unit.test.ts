import assert from 'node:assert/strict'
import test from 'node:test'
import { BLOCK_WINDOW_MS, LoginAttempts, MAX_FAILED_ATTEMPTS } from './LoginAttempts'

const ORIGIN = '10.0.0.7'
const NOW = 1_700_000_000_000

function failTimes(attempts: LoginAttempts, times: number, now = NOW): void {
  for (let attempt = 0; attempt < times; attempt += 1) attempts.registerFailure(ORIGIN, now)
}

test('an unknown origin is not blocked', () => {
  assert.equal(new LoginAttempts().isBlocked(ORIGIN, NOW), false)
})

test('failures below the limit do not block', () => {
  const attempts = new LoginAttempts()

  failTimes(attempts, MAX_FAILED_ATTEMPTS - 1)

  assert.equal(attempts.isBlocked(ORIGIN, NOW), false)
})

test('reaching the limit blocks the next attempt', () => {
  const attempts = new LoginAttempts()

  failTimes(attempts, MAX_FAILED_ATTEMPTS)

  assert.equal(attempts.isBlocked(ORIGIN, NOW), true)
})

test('a success clears the count before the limit', () => {
  const attempts = new LoginAttempts()

  failTimes(attempts, MAX_FAILED_ATTEMPTS - 1)
  attempts.registerSuccess(ORIGIN)
  failTimes(attempts, MAX_FAILED_ATTEMPTS - 1)

  assert.equal(attempts.isBlocked(ORIGIN, NOW), false)
})

test('the block expires once the window passes', () => {
  const attempts = new LoginAttempts()

  failTimes(attempts, MAX_FAILED_ATTEMPTS)

  assert.equal(attempts.isBlocked(ORIGIN, NOW + BLOCK_WINDOW_MS - 1), true)
  assert.equal(attempts.isBlocked(ORIGIN, NOW + BLOCK_WINDOW_MS), false)
})

test('each origin is counted on its own', () => {
  const attempts = new LoginAttempts()

  failTimes(attempts, MAX_FAILED_ATTEMPTS)

  assert.equal(attempts.isBlocked('192.168.1.9', NOW), false)
})

test('rubbish arguments never block anyone', () => {
  const attempts = new LoginAttempts()

  attempts.registerFailure(undefined, NOW)
  attempts.registerFailure(ORIGIN, undefined)

  assert.equal(attempts.isBlocked(ORIGIN, NOW), false)
  assert.equal(attempts.isBlocked(undefined, NOW), false)
})
