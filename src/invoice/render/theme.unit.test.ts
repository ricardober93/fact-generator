import assert from 'node:assert/strict'
import test from 'node:test'
import { invoiceDocumentFixture } from './__fixtures__/invoiceDocument'
import { resolveTheme } from './theme'

test('a declared parameter overrides its token', () => {
  const theme = resolveTheme(invoiceDocumentFixture(), { color: '#ff6600' })

  assert.equal(theme.primary, '#ff6600')
})

test('an undeclared parameter is ignored', () => {
  const theme = resolveTheme(invoiceDocumentFixture(), { border: '#000000' })

  assert.equal(theme.border, '#dddddd')
  assert.equal(theme.primary, '#0a58ca')
})

test('a value outside the allowed list falls back to the default', () => {
  const theme = resolveTheme(invoiceDocumentFixture(), { density: '48pt' })

  assert.equal(theme.fontSizeBase, '10pt')
})

test('a value inside the allowed list is applied', () => {
  const theme = resolveTheme(invoiceDocumentFixture(), { density: '12pt' })

  assert.equal(theme.fontSizeBase, '12pt')
})

test('resolving without parameters yields the declared defaults', () => {
  const theme = resolveTheme(invoiceDocumentFixture())

  assert.equal(theme.primary, '#0a58ca')
  assert.equal(theme.fontSizeBase, '10pt')
})

test('resolving does not mutate the document theme', () => {
  const doc = invoiceDocumentFixture()

  resolveTheme(doc, { color: '#ff6600' })

  assert.equal(doc.theme.primary, '#0a58ca')
})
