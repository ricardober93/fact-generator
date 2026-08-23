import assert from 'node:assert/strict'
import test from 'node:test'
import { CONFLICT_MESSAGE, nextSaveState, SAVED_MESSAGE, type ISaveState } from './saveOutcome'

const EDITING: ISaveState = { id: 'inv-1', rev: 4, status: '' }

test('a saved reply adopts the new revision and says so', () => {
  const next = nextSaveState(EDITING, { status: 'saved', id: 'inv-1', rev: 5 })

  assert.equal(next.rev, 5)
  assert.equal(next.status, SAVED_MESSAGE)
})

test('a conflict warns and never claims the invoice was saved', () => {
  const next = nextSaveState(EDITING, { status: 'conflict', id: 'inv-1', rev: 9 })

  assert.equal(next.status, CONFLICT_MESSAGE)
  assert.notEqual(next.status, SAVED_MESSAGE)
})

test('a conflict does not disturb the invoice being edited', () => {
  const next = nextSaveState(EDITING, { status: 'conflict', id: 'otro', rev: 9 })

  assert.equal(next.id, EDITING.id)
})

test('a conflict adopts the stored revision so a second try can go through', () => {
  const warned = nextSaveState(EDITING, {
    status: 'conflict',
    id: 'inv-1',
    rev: 9,
  })

  const retried = nextSaveState(warned, {
    status: 'saved',
    id: 'inv-1',
    rev: 10,
  })

  assert.equal(warned.rev, 9)
  assert.equal(retried.status, SAVED_MESSAGE)
})

test('a reply without a status is treated as saved, so a stale island never blocks work', () => {
  const next = nextSaveState(EDITING, { id: 'inv-1', rev: 5 })

  assert.equal(next.status, SAVED_MESSAGE)
})

test('creating an invoice picks up the id the server assigned', () => {
  const creating: ISaveState = { id: null, rev: 0, status: '' }

  const next = nextSaveState(creating, { status: 'saved', id: 'nueva', rev: 1 })

  assert.equal(next.id, 'nueva')
  assert.equal(next.rev, 1)
})
