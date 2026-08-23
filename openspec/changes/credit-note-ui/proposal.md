## Why

`invoice-issuance` dejó las notas de crédito **completas por dentro y sin puerta por fuera**.
`InvoiceRepository.createCreditNoteFor` existe, está specificada y tiene ocho pruebas, pero fuera de
los tests **nadie la llama**: no hay botón en una factura emitida, no hay ruta, y el motivo —que la
emisión exige— no tiene casilla en el formulario.

El resultado es la peor forma de tener una funcionalidad: el spec dice que se puede corregir una
factura, las pruebas lo demuestran, y una persona sentada delante de la aplicación no puede hacerlo.
Y como `credit-notes` declara que corregir es **la única** forma de cambiar el efecto de un
documento emitido, ahora mismo no hay ninguna: la anulación se quitó y su sustituto no es
alcanzable.

## What Changes

- **Botón «Corregir» en una factura emitida**, que crea la nota de crédito partiendo de ella y
  lleva a su borrador. En un borrador no aparece: no se corrige lo que todavía se edita.
- **El motivo es un campo del formulario**, no un dato que solo existe en el modelo. Aparece únicamente
  cuando el documento es una nota de crédito, y se guarda con el resto del borrador.
- **La cabecera de una nota de crédito dice a quién corrige**, con el número y el prefijo que se
  guardaron al crearla, enlazando a la factura corregida.
- **La lista enlaza en los dos sentidos**: desde una factura emitida se ve si tiene notas de crédito.
- **El aviso de emisión ya distingue el motivo ausente** (`MISSING_REASON` está en `issueOutcome`),
  así que emitir sin motivo deja de ser un mensaje sobre un campo que no existía.

## Capabilities

### New Capabilities

Ninguna. No se abre superficie nueva: se le pone puerta a una que ya está specificada.

### Modified Capabilities

- `credit-notes`: la creación desde la factura corregida y el motivo obligatorio dejan de ser
  capacidades del repositorio y pasan a tener superficie —botón, campo y cabecera—. Se añade cómo se
  ve la referencia al documento corregido y desde dónde se llega a corregir.
- `invoice-records`: el formulario gana un campo que **no** sale del `dataSchema` de la plantilla. Es
  la segunda excepción a «el formulario se deriva del schema», después del número, y por la misma
  razón: es un dato del documento, no de su diseño.

## Impact

**Código tocado**: `InvoiceController.tsx` (acción `correct`, y pasar el motivo y la referencia al
editor), `InvoiceEditor.island.tsx` (campo de motivo, cabecera de corrección), `InvoiceToolbar.tsx`
(botón «Corregir» cuando está emitida), `InvoiceList.tsx` (relación entre documentos).

**Sin cambios en el dominio.** `createCreditNoteFor`, `corrects`, `correctionReason` y las reglas de
emisión ya están y no se tocan: este cambio es superficie.

**Sin dependencias npm nuevas.**

## Fuera de alcance

- **Sin aritmética automática de la corrección.** Quitar líneas ajusta los totales con el mismo
  cálculo del formulario; no se calcula «cuánto queda por corregir» ni se impide corregir de más.
  Eso es control contable y necesita saldos, que no existen.
- **Sin notas débito.** El brief no las pidió y la DIAN las trata como documento aparte.
- **Sin conceptos de corrección de la DIAN.** El motivo sigue siendo texto libre, como decidió
  `credit-notes`.
- **Sin cambios en la numeración, la congelación ni el repintado.** Todo lo cerrado en
  `invoice-issuance` sigue igual.
