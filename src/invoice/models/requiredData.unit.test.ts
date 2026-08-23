import assert from 'node:assert/strict'
import test from 'node:test'
import { findTemplatePreset } from '../templates/presets'
import { assertDataSatisfiesTemplate, isSystemWritten } from './requiredData'

const DOC = findTemplatePreset('chevron-slate')!.build()

test('without the filter nothing is skipped, which is what the handoff needs', () => {
  assert.throws(
    () => assertDataSatisfiesTemplate(DOC, { cliente: { nombre: 'Ana' } }, []),
    /emisor\.nombre/,
  )
})

test('the paths the system writes are not demanded from the person', () => {
  assert.equal(isSystemWritten('factura.numero'), true)
  assert.equal(isSystemWritten('emisor.nombre'), true)
  assert.equal(isSystemWritten('cliente.nombre'), false)
})

test('a draft without number or issuer is accepted, because nobody can type them', () => {
  assert.doesNotThrow(() =>
    assertDataSatisfiesTemplate(
      DOC,
      { cliente: { nombre: 'Ana' }, factura: { total: 10 } },
      [{ descripcion: 'Uno', total: 10 }],
      isSystemWritten,
    ),
  )
})

test('a draft missing what the person does fill is still refused', () => {
  assert.throws(
    () =>
      assertDataSatisfiesTemplate(DOC, { factura: { total: 10 } }, [
        { descripcion: 'Uno', total: 10 },
      ]),
    /cliente/,
  )
})
