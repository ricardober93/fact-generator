## Why

Guardar una factura pisa lo que haya sin mirar:

```ts
async saveInvoice(id: string, input: IInvoiceInput): Promise<Invoice> {
  const invoice = await this.find(id)
  if (!invoice) throw notFound()
  invoice.applyChanges(await this.checked(input))
  await this.update(invoice)
  return invoice
}
```

No hay comparación de revisión ni bloqueo. Dos pestañas abiertas sobre la misma factura —o la
misma persona en el portátil y en el móvil— y la última en pulsar «Guardar» borra el trabajo de
la otra **en silencio**: nadie ve un aviso, nadie ve un error, y los datos perdidos no dejan
rastro.

La plantilla, que es la otra entidad editable del proyecto, sí está protegida: `rev`,
comparación contra `expectedRev`, `Locker` por id y un `409` cuando alguien se adelanta.
ARCHITECTURE.md §7 lo da por decidido para todo el proyecto —«Escritura con **bloqueo
optimista** por campo `rev`: el JSONB se reescribe entero, así que sin `rev` la última
escritura gana en silencio»— y describe exactamente el fallo que la factura tiene hoy. La
regla está escrita; a la factura no se le aplicó.

Y hay un segundo hallazgo, encontrado al leer cómo viaja hoy el conflicto de la plantilla hasta
el navegador. `callAction` **descarta el estado HTTP, el `code` y el `info`** del error y
propaga solo el mensaje:

```js
const message = parsed?.error?.message ?? `Action failed with status ${response.status}`
throw new Error(message)
```

Por eso el editor de plantillas detecta el conflicto husmeando el texto:

```ts
const conflict = /409|revisi/i.test(message)
```

Funciona **por casualidad**: el mensaje de desarrollador que envía el servidor es
`Template revision is stale, stored revision is 3`, y «revision» encaja con `/revisi/i`. El día
que alguien reescriba ese mensaje —o lo traduzca— la detección se degrada a un error genérico
sin que falle ninguna prueba. Copiar ese patrón a la factura sería propagar una trampa.

## What Changes

- `Invoice` gana `rev`, igual que `Template`. Se crea en 1 y sube en cada guardado.
- `saveInvoice` compara la revisión recibida con la almacenada dentro de un `Locker` por id.
  Si no coinciden, **no escribe nada**.
- El conflicto viaja como **valor, no como excepción**: la acción responde `200` con
  `{ status: 'conflict', rev }` en lugar de lanzar un `409`. El cliente lee un campo tipado y
  deja de adivinar por el texto del mensaje.
- El editor de facturas avisa del conflicto **conservando lo que la persona tenía escrito**.
  Nunca recarga por su cuenta ni descarta cambios: quien decide es quien está delante.
- **Alineación de la plantilla** (grupo separado, ver "Fuera de alcance"): `/templates` deja de
  detectar el conflicto por expresión regular y pasa al mismo campo tipado.

## Capabilities

### New Capabilities

Ninguna. Esto no abre una superficie nueva: endurece cómo se guarda algo que ya se guarda.

### Modified Capabilities

- `invoice-records`: guardar una factura pasa a exigir la revisión que se leyó, y un guardado
  que llega tarde se rechaza en lugar de pisar. Cambia además qué se almacena: a los datos, las
  líneas, la plantilla y los parámetros se les suma el contador de revisión.

## Impact

**Código tocado**: `Invoice.ts` (campo y `applyRevision`), `InvoiceRepository.ts` (`Locker` +
comparación), `InvoiceController.tsx` (la acción `save` devuelve el resultado como valor),
`InvoiceEditor.island.tsx` (manda `rev`, lee el conflicto). Y, en su propio grupo,
`TemplateController.tsx` y `Editor.island.tsx`.

**Datos**: **hay filas existentes sin `rev`**. No se añade migración: una factura sin revisión
se lee como `0`, y el primer guardado la deja en `1`. El cliente devuelve lo que recibió, así
que una factura vieja se guarda a la primera sin fricción. Es el punto que hay que probar
explícitamente, no dar por hecho.

**Interfaz de la acción `save`**: hoy responde `{ id, duplicate }`; pasa a responder
`{ status, id, duplicate, rev }`. Solo la consume el island propio, no hay integradores
externos.

**Sin efecto sobre la clave de caché**: `versionOfInvoice` hashea el contenido (`data`, `items`,
`params`, `templateId`), y ese contenido cambia exactamente cuando cambia `rev`. **No hay que
añadir `rev` a la clave** — hacerlo no la haría más correcta, solo más larga.

**Concurrencia**: `InvoiceRepository` pasa a inyectar `Locker`, como ya hace
`TemplateRepository`. Sin él, comparar-y-escribir es una carrera con una ventana pequeña pero
real.

## Fuera de alcance

Este cambio **no reabre** ninguna decisión cerrada del proyecto:

- **Sin fusión automática de cambios.** Ante un conflicto se avisa y se conserva lo local; no se
  intenta combinar dos versiones campo a campo. Eso es un editor colaborativo, y no es este
  proyecto.
- **Sin tiempo real, sin websockets, sin presencia.** Nadie ve «otra persona está editando».
- **Sin historial de versiones ni deshacer en servidor.** `rev` es un contador para detectar
  carreras, no un registro de cambios: no se guardan las revisiones anteriores.
- **Sin bloqueo pesimista.** No se reserva una factura al abrirla; quien llega tarde se entera
  al guardar, no antes.
- **Sin tocar la subida de imágenes**, que sigue sin ruta HTTP (hallazgo del cambio anterior).
- **Sin paginación en pantalla**, que sigue siendo la pregunta abierta de ARCHITECTURE.md §7.
- **Sin dependencias npm nuevas.** `Locker` y `CustomError` ya vienen del framework.
- El resto sigue intacto: documento presentacional y no fiscal, milímetros, bandas, PDF solo por
  impresión del navegador, imágenes en base64 en `Asset`.

**Una decisión de alcance explícita.** Arreglar el husmeo por expresión regular de la plantilla
**no** es lo que se pidió: se pidió el bloqueo de la factura. Se incluye igualmente, en su
propio grupo de tareas, porque dejar un editor con detección tipada y el otro adivinando por el
texto es la clase de asimetría que se pudre —el siguiente que toque el mensaje romperá el que no
mire—. Es el grupo más fácil de cortar si se prefiere entregar solo la factura.
