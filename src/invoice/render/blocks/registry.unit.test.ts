import assert from 'node:assert/strict'
import test from 'node:test'
import { applyDefaults, blockKinds, findBlockDefinition } from './registry'

test('the registry exposes exactly the four initial kinds', () => {
  assert.deepEqual(blockKinds().sort(), ['box', 'image', 'line', 'text'])
})

test('an unknown kind does not resolve', () => {
  assert.equal(findBlockDefinition('qr'), null)
  assert.throws(() => applyDefaults('qr'), /Unknown block kind/)
})

test('applyDefaults fills a block created with only its kind', () => {
  const block = applyDefaults('line')

  assert.equal(block.kind, 'line')
  assert.equal(block.widthMm, 40)
  assert.equal(block.props.orientation, 'horizontal')
  assert.equal(block.props.color, '@border')
  assert.ok(block.id.length > 0)
})

test('applyDefaults keeps what the caller provides', () => {
  const block = applyDefaults('text', { id: 'title', xMm: 12, props: { align: 'right' } })

  assert.equal(block.id, 'title')
  assert.equal(block.xMm, 12)
  assert.equal(block.props.align, 'right')
  assert.equal(block.props.color, '@text')
})

test('every definition declares defaults inside its own schema', () => {
  for (const kind of blockKinds()) {
    const definition = findBlockDefinition(kind)!
    for (const propName of Object.keys(definition.defaults.props)) {
      assert.ok(propName in definition.schema, `${kind}.${propName} is not in the schema`)
    }
  }
})
