import assert from 'node:assert/strict'
import test from 'node:test'
import { hexValueOf, looksLikeColor } from './themeValues'

test('hex and colour functions read as colours', () => {
  for (const value of ['#fff', '#FFFFFF', '#0a58ca', '#0a58ca80', 'rgb(1,2,3)', 'hsl(0 0% 0%)']) {
    assert.equal(looksLikeColor(value), true, `${value} should read as a colour`)
  }
})

test('a font stack or a size is not a colour', () => {
  for (const value of ['Helvetica, Arial, sans-serif', '10pt', '', '   ', 'bold']) {
    assert.equal(looksLikeColor(value), false, `${value} should not read as a colour`)
  }
})

test('the swatch value is a six digit hex or nothing', () => {
  assert.equal(hexValueOf('#abc'), '#aabbcc')
  assert.equal(hexValueOf('#0A58CA'), '#0a58ca')
  assert.equal(hexValueOf('#0a58ca80'), '#0a58ca')
  assert.equal(hexValueOf('rgb(1,2,3)'), null)
  assert.equal(hexValueOf('Helvetica'), null)
})
