import assert from 'node:assert/strict'
import test from 'node:test'
import { emptyDocument, type IDocument, type IPropValue } from '../document'
import { validateDocument } from '../validateDocument'
import { defineBlock } from './defineBlock'
import {
  applyDefaults,
  blockKinds,
  blockKindsForBand,
  findBlockDefinition,
  withBlockDefaults,
} from './registry'

test('the registry exposes exactly the six kinds', () => {
  assert.deepEqual(blockKinds().sort(), ['box', 'image', 'line', 'list', 'table', 'text'])
})

test('a band only offers the kinds it admits', () => {
  assert.ok(blockKindsForBand('detail').includes('table'))
  assert.ok(!blockKindsForBand('pageFooter').includes('table'))
  assert.ok(blockKindsForBand('pageFooter').includes('text'))
  assert.throws(() => blockKindsForBand('nowhere' as 'detail'), /known band/)
})

test('defineBlock rejects an empty or unknown band declaration', () => {
  const base = {
    schema: { color: 'token' } as const,
    defaults: { xMm: 0, yMm: 0, widthMm: 1, heightMm: 1, props: { color: '@text' } },
    render: () => null,
  }

  assert.throws(() => defineBlock({ kind: 'a', ...base, bands: [] }), /must not be empty/)
  assert.throws(
    () => defineBlock({ kind: 'a', ...base, bands: ['nope' as 'detail'] }),
    /unknown band/,
  )
  assert.ok(defineBlock({ kind: 'a', ...base }).bands === undefined)
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

function documentWithBox(props: Record<string, IPropValue>): IDocument {
  const doc = emptyDocument()
  doc.bands.header.blocks = [{ ...applyDefaults('box', { id: 'shape' }), props }]
  return doc
}

test('a document saved before a property existed still validates once read', () => {
  const stored = documentWithBox({ fill: '@surface', border: '@border', borderWidthMm: 0.2 })

  assert.ok(validateDocument(stored).length > 0)
  assert.deepEqual(validateDocument(withBlockDefaults(stored)), [])
  assert.equal(withBlockDefaults(stored).bands.header.blocks[0].props.rotationDeg, 0)
})

test('filling defaults never overwrites a stored value', () => {
  const stored = documentWithBox({
    fill: '@accent',
    border: '@border',
    borderWidthMm: 0.2,
    radiusMm: 3,
    rotationDeg: 45,
  })

  const block = withBlockDefaults(stored).bands.header.blocks[0]

  assert.equal(block.props.fill, '@accent')
  assert.equal(block.props.rotationDeg, 45)
  assert.equal(block.props.radiusMm, 3)
})

test('filling defaults leaves an unknown kind for the validation to report', () => {
  const doc = emptyDocument()
  doc.bands.header.blocks = [
    { id: 'x', kind: 'qr', xMm: 0, yMm: 0, widthMm: 1, heightMm: 1, props: {} },
  ]

  assert.doesNotThrow(() => withBlockDefaults(doc))
  assert.ok(
    validateDocument(withBlockDefaults(doc)).some((issue) =>
      /unknown block kind/.test(issue.message),
    ),
  )
})

test('every definition declares defaults inside its own schema', () => {
  for (const kind of blockKinds()) {
    const definition = findBlockDefinition(kind)!
    for (const propName of Object.keys(definition.defaults.props)) {
      assert.ok(propName in definition.schema, `${kind}.${propName} is not in the schema`)
    }
  }
})
