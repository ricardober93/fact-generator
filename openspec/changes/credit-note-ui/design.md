## Context

Todo el dominio de la nota de crédito está construido y probado: `createCreditNoteFor`, `corrects`,
`correctionReason`, el rango propio y los rechazos de emisión. Lo que falta es exclusivamente
superficie, y por eso este diseño es corto: no hay ninguna decisión de modelo que tomar.

El editor de facturas es un island (`InvoiceEditor.island.tsx`) que ya sabe pintar dos estados —
borrador editable y emitido en solo lectura—. Este cambio le añade un eje: el **tipo** de documento.

## Goals / Non-Goals

**Goals:**

- Que corregir una factura emitida sea alcanzable con el ratón.
- Que el motivo se pueda escribir, que es la condición que la emisión ya exige.
- Que una nota de crédito diga siempre a qué factura pertenece.

**Non-Goals:**

- Tocar el dominio. Si este cambio necesita cambiar `InvoiceRepository`, algo se entendió mal.
- Calcular saldos, corregir de más o de menos, o encadenar correcciones.

## Decisions

### 1. El motivo entra por el mismo `save` que ya existe

`SaveInvoiceDto` gana un campo opcional `correctionReason` y el island lo manda como cualquier otro
valor del formulario. `saveInvoice` ya lo aplica cuando viene definido —se hizo en `invoice-issuance`—
así que no hay acción nueva ni segundo camino de escritura.

_Alternativa descartada_: una acción propia `setReason`. Dos caminos para escribir en el mismo
borrador es la forma de que uno de los dos se olvide del bloqueo optimista.

### 2. El motivo se pinta fuera del formulario derivado del schema

`formShapeOf` sigue devolviendo exactamente lo que declara el `dataSchema`. El campo de motivo lo
pinta el island **junto** al formulario, no dentro de su recorrido, condicionado al tipo de
documento.

_Alternativa descartada_: inyectar un campo sintético en `IFormShape`. Ensucia una función pura y
bien probada con un caso que no viene del documento, y obliga a que todo lo que consume el shape
sepa distinguir campos reales de inventados.

### 3. Corregir es una acción que redirige, no una que devuelve datos

`POST /invoices/_action/correct` crea la nota de crédito y responde con `redirect` al borrador nuevo,
como ya hace `remove`. El island no tiene que saber montar la página siguiente.

### 4. La cabecera de corrección se pinta en el servidor

`corrects` no cambia mientras se edita, así que viaja como prop del island y se pinta sin señal.
Un dato que no cambia no necesita estado reactivo.

## Risks / Trade-offs

- **Un doble clic en «Corregir» crea dos borradores** → Se acepta. Un borrador de más se borra, y
  la idempotencia que importa —no emitir dos veces— ya está en `issueInvoice`. Poner una clave aquí
  sería proteger lo barato.
- **La factura corregida no sabe cuántas notas la corrigen** → La lista las relaciona por `corrects`,
  que es una consulta sobre un campo, no un contador guardado. Sin contadores que mantener
  sincronizados.

## Migration Plan

Ninguna. Ni datos nuevos, ni campos nuevos, ni cambios en lo guardado.

## Open Questions

Ninguna.
