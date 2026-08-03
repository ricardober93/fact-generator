import assert from 'node:assert/strict'
import test from 'node:test'
import { isLocalPath, localPathOr, loginPathFor } from './localPath'

const FALLBACK = '/invoices'

test('a local path is kept as it was given', () => {
  assert.equal(localPathOr('/invoices/42', FALLBACK), '/invoices/42')
  assert.equal(localPathOr('/', FALLBACK), '/')
  assert.equal(localPathOr('/templates?tab=design', FALLBACK), '/templates?tab=design')
})

test('an absolute url to another host falls back', () => {
  assert.equal(localPathOr('https://malo.example', FALLBACK), FALLBACK)
  assert.equal(localPathOr('http://malo.example/invoices', FALLBACK), FALLBACK)
})

test('a protocol relative target falls back', () => {
  assert.equal(localPathOr('//malo.example', FALLBACK), FALLBACK)
})

test('a backslash target falls back, because browsers read it as protocol relative', () => {
  assert.equal(localPathOr('/\\malo.example', FALLBACK), FALLBACK)
  assert.equal(localPathOr('/\\/malo.example', FALLBACK), FALLBACK)
})

test('an absent or empty target falls back', () => {
  assert.equal(localPathOr(undefined, FALLBACK), FALLBACK)
  assert.equal(localPathOr('', FALLBACK), FALLBACK)
  assert.equal(localPathOr(null, FALLBACK), FALLBACK)
  assert.equal(localPathOr(42, FALLBACK), FALLBACK)
})

test('a target carrying control characters falls back', () => {
  const withNewline = ['/invoices', 'Location: https://malo.example'].join(String.fromCharCode(10))

  assert.equal(isLocalPath(withNewline), false)
  assert.equal(localPathOr(withNewline, FALLBACK), FALLBACK)
})

test('a fallback is required', () => {
  assert.throws(() => localPathOr('/invoices', ''), /requires a fallback/)
})

test('the login path carries the destination encoded', () => {
  assert.equal(loginPathFor('/invoices/42'), '/login?next=%2Finvoices%2F42')
})

test('the login path drops a destination it would not honour anyway', () => {
  assert.equal(loginPathFor('https://malo.example'), '/login')
  assert.equal(loginPathFor('//malo.example'), '/login')
  assert.equal(loginPathFor(undefined), '/login')
})
