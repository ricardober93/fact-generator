import assert from 'node:assert/strict'
import test from 'node:test'
import { checkArithmetic } from './checkArithmetic'
import type { IInvoiceRecord } from './Invoice'

function factura(fields: IInvoiceRecord): IInvoiceRecord {
  return { factura: fields }
}

test('a document whose arithmetic adds up has no issues', () => {
  const issues = checkArithmetic(factura({ base: 100, impuestos: 19, total: 119 }), [
    { cantidad: 2, precio: 25, total: 50 },
    { cantidad: 1, precio: 50, total: 50 },
  ])

  assert.deepEqual(issues, [])
})

test('a line whose amount does not match its quantity times its price is reported', () => {
  const issues = checkArithmetic({}, [{ cantidad: 3, precio: 25, total: 70 }])

  assert.equal(issues.length, 1)
  assert.equal(issues[0].kind, 'line')
  assert.equal(issues[0].line, 0)
  assert.equal(issues[0].expected, 75)
  assert.equal(issues[0].found, 70)
})

test('a base that does not match the sum of the lines is reported', () => {
  const issues = checkArithmetic(factura({ base: 90 }), [
    { cantidad: 1, precio: 50, total: 50 },
    { cantidad: 1, precio: 50, total: 50 },
  ])

  assert.equal(issues.length, 1)
  assert.equal(issues[0].kind, 'base')
  assert.equal(issues[0].expected, 100)
})

test('a total that does not match base plus taxes is reported', () => {
  const issues = checkArithmetic(factura({ base: 100, impuestos: 19, total: 125 }), [])

  assert.equal(issues.length, 1)
  assert.equal(issues[0].kind, 'total')
  assert.equal(issues[0].expected, 119)
  assert.equal(issues[0].found, 125)
})

test('taxes that are not declared count as zero', () => {
  assert.deepEqual(checkArithmetic(factura({ base: 100, total: 100 }), []), [])
  assert.equal(checkArithmetic(factura({ base: 100, total: 119 }), []).length, 1)
})

test('what the document does not carry is not checked', () => {
  assert.deepEqual(checkArithmetic({}, [{ descripcion: 'Sin importes' }]), [])
  assert.deepEqual(checkArithmetic(factura({ total: 500 }), []), [])
  assert.deepEqual(checkArithmetic(factura({ base: 100 }), []), [])
})

test('a line missing one of its three values is not checked', () => {
  assert.deepEqual(checkArithmetic({}, [{ cantidad: 3, total: 70 }]), [])
  assert.deepEqual(checkArithmetic({}, [{ cantidad: 3, precio: 25 }]), [])
})

test('an empty value is absent, not zero', () => {
  assert.deepEqual(checkArithmetic(factura({ base: '', total: 100 }), []), [])
  assert.deepEqual(checkArithmetic({}, [{ cantidad: 3, precio: 25, total: '' }]), [])
})

test('amounts written as text are read as numbers', () => {
  assert.deepEqual(checkArithmetic(factura({ base: '100', total: '119', impuestos: '19' }), []), [])
})

test('cents do not drift on sums that float would round badly', () => {
  const issues = checkArithmetic(factura({ base: 0.3, total: 0.3 }), [
    { cantidad: 1, precio: 0.1, total: 0.1 },
    { cantidad: 1, precio: 0.2, total: 0.2 },
  ])

  assert.deepEqual(issues, [])
})

test('a line priced with a fractional quantity still checks out', () => {
  assert.deepEqual(checkArithmetic({}, [{ cantidad: 2.5, precio: 4, total: 10 }]), [])
})

test('every mismatch is reported, not just the first', () => {
  const issues = checkArithmetic(factura({ base: 90, impuestos: 10, total: 200 }), [
    { cantidad: 3, precio: 25, total: 70 },
  ])

  assert.deepEqual(
    issues.map((found) => found.kind),
    ['line', 'base', 'total'],
  )
})
