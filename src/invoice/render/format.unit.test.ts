import assert from 'node:assert/strict'
import test from 'node:test'
import { MISSING } from '../../kernel/paths'
import { invoiceDocumentFixture } from './__fixtures__/invoiceDocument'
import { formatOptionsOf, formatValue } from './format'
import { resolveTheme } from './theme'

const ES_EUR = { locale: 'es-ES', currency: 'EUR' }

test('currency matches what Intl produces for the same inputs', () => {
  const expected = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(1234.5)

  assert.equal(formatValue(1234.5, 'currency', ES_EUR), expected)
})

test('number, percent and date go through Intl', () => {
  assert.equal(formatValue(1234.5, 'number', ES_EUR), new Intl.NumberFormat('es-ES').format(1234.5))
  assert.equal(
    formatValue(0.21, 'percent', ES_EUR),
    new Intl.NumberFormat('es-ES', { style: 'percent' }).format(0.21),
  )
  assert.equal(
    formatValue('2026-08-01T00:00:00.000Z', 'date', ES_EUR),
    new Intl.DateTimeFormat('es-ES').format(new Date('2026-08-01T00:00:00.000Z')),
  )
})

test('an unknown format leaves the value untouched', () => {
  assert.equal(formatValue(1234.5, 'moneda', ES_EUR), '1234.5')
})

test('a non numeric value with a numeric format is printed as is, never NaN', () => {
  assert.equal(formatValue('n/d', 'currency', ES_EUR), 'n/d')
  assert.equal(formatValue('n/d', 'number', ES_EUR), 'n/d')
})

test('an unparseable date is printed as is', () => {
  assert.equal(formatValue('ayer', 'date', ES_EUR), 'ayer')
})

test('a missing value formats as empty for any format', () => {
  assert.equal(formatValue(MISSING, 'currency', ES_EUR), '')
})

test('locale and currency come from the document by default', () => {
  const doc = invoiceDocumentFixture()

  const options = formatOptionsOf(doc, resolveTheme(doc))

  assert.equal(options.locale, 'es-ES')
  assert.equal(options.currency, 'EUR')
})

test('a declared parameter overrides the currency without touching any block', () => {
  const doc = invoiceDocumentFixture()

  const options = formatOptionsOf(doc, resolveTheme(doc, { moneda: 'USD' }))

  assert.equal(options.currency, 'USD')
  assert.equal(formatValue(10, 'currency', options).includes('US'), true)
})

test('an undeclared locale parameter is ignored', () => {
  const doc = invoiceDocumentFixture()

  const options = formatOptionsOf(doc, resolveTheme(doc, { locale: 'en-US' }))

  assert.equal(options.locale, 'es-ES')
})

test('a date without a time is read in the local day, not shifted by the timezone', () => {
  assert.equal(formatValue('2020-12-12', 'date', ES_EUR), '12/12/2020')
})
