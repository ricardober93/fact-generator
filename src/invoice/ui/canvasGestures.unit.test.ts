import assert from 'node:assert/strict'
import test from 'node:test'
import { findTemplatePreset } from '../templates/presets'
import { pickableBlockId } from './canvasGestures'

const doc = findTemplatePreset('mosaic-red')!.build()
const blocks = doc.bands.header.blocks

test('a click on a decorative block picks nothing', () => {
  const decorative = blocks.find((block) => block.decorative)!

  assert.equal(pickableBlockId(doc, 'header', decorative.id), null)
})

test('a click on a normal block picks it', () => {
  const plain = blocks.find((block) => !block.decorative)!

  assert.equal(pickableBlockId(doc, 'header', plain.id), plain.id)
})

test('a click on nothing, or on a block of another band, picks nothing', () => {
  assert.equal(pickableBlockId(doc, 'header', null), null)
  assert.equal(pickableBlockId(doc, 'summary', blocks[0].id), null)
})
