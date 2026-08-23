import assert from 'node:assert/strict'
import test from 'node:test'
import { versionKey } from './versionKey'

test('the same content always gives the same key', () => {
  const content = { rev: 3, items: [{ total: 70 }] }

  assert.equal(versionKey(content), versionKey({ rev: 3, items: [{ total: 70 }] }))
})

test('different content gives a different key', () => {
  const before = versionKey({ rev: 3, items: [{ total: 70 }] })
  const after = versionKey({ rev: 3, items: [{ total: 71 }] })

  assert.notEqual(before, after)
})

test('a missing field is not the same as an empty one', () => {
  assert.notEqual(versionKey({ name: 'uno' }), versionKey({ name: 'uno', extra: '' }))
})

test('the key is a short hexadecimal string', () => {
  const key = versionKey({ rev: 1 })

  assert.equal(typeof key, 'string')
  assert.equal(key.length, 16)
  assert.match(key, /^[0-9a-f]+$/)
})

test('the key never carries the content it hashes', () => {
  const key = versionKey({ secret: 'una-contraseña-larga' })

  assert.equal(key.includes('contraseña'), false)
})

test('hashing nothing is a programming error, not a key', () => {
  assert.throws(() => versionKey(undefined))
})
