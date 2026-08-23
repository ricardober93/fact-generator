import assert from 'node:assert/strict'
import test from 'node:test'
import { issuedMessage, issueRefusal } from './issueOutcome'

test('every refusal says something a person can act on', () => {
  assert.match(issueRefusal('NO_NUMBER_RANGE'), /rango/i)
  assert.match(issueRefusal('RANGE_EXHAUSTED'), /agot/i)
  assert.match(issueRefusal('RANGE_EXPIRED'), /vigencia/i)
  assert.match(issueRefusal('NUMBER_ALREADY_USED'), /ya lo tiene/i)
  assert.match(issueRefusal('MISSING_REASON'), /motivo/i)
})

test('an arithmetic refusal names where the numbers stop adding up', () => {
  const message = issueRefusal('ARITHMETIC_MISMATCH', [
    { kind: 'line', line: 0, expected: 75, found: 70 },
    { kind: 'total', expected: 119, found: 125 },
  ])

  assert.match(message, /línea 1/)
  assert.match(message, /el total/)
})

test('an arithmetic refusal without detail still reads as a sentence', () => {
  assert.equal(issueRefusal('ARITHMETIC_MISMATCH'), 'Los importes no cuadran.')
})

test('issuing reports the number it landed on', () => {
  assert.equal(issuedMessage('FE1247'), 'Emitida FE1247')
})
