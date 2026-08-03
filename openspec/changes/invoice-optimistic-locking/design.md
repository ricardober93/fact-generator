## Context

Ver `proposal.md` para el porqué y `specs/invoice-records/spec.md` para el qué. Aquí solo va el
cómo.

**La pieza ya existe en el proyecto.** `TemplateRepository.saveDocument` es la referencia, y se
copia su forma casi entera:

```ts
return this.locker.withKey(`template:${id}`).run(async () => {
  const template = await this.findOrThrow(id)
  if (template.rev !== expectedRev) return { status: 'conflict', template }
  template.applyRevision(doc)
  await this.update(template)
  return { status: 'saved', template }
})
```

Fíjese en algo que se aprovecha entero: **el repositorio ya devuelve el conflicto como valor**,
no como excepción. `ISaveDocumentResult` es `{ status: 'saved' | 'conflict', template }`. Quien
lo convierte en un `409` lanzado es el _controlador_, una capa más arriba. Esa conversión es la
que este cambio no repite.

**Lo que el cliente puede ver de un error**, verificado en
`feature/ui-controller/actions.js` y `runUiControllers.js`:

| Capa                | Qué hace                                                                          |
| ------------------- | --------------------------------------------------------------------------------- |
| `sendJsonError`     | Manda `{ error: { message, stack, ...info } }` con el `httpCode` como estado HTTP |
| `callAction`        | Lee **solo** `parsed?.error?.message` y lanza un `Error` plano                    |
| Editor de plantilla | Recupera la semántica husmeando: `/409\|revisi/i.test(message)`                   |

El estado HTTP, el `code` (`TEMPLATE_REVISION_CONFLICT`) y el `info` llegan al navegador dentro
del JSON, pero `callAction` los tira antes de que nadie pueda leerlos. Un island que quiera
distinguir «conflicto» de «error» y use `callAction` **no tiene ninguna vía tipada**. Ese es el
hecho que manda sobre la decisión 2.

**Estado de la factura hoy**: `saveInvoice` hace `find` → `applyChanges` → `update`, sin
comparar nada y sin `Locker`. `IInvoiceData` no tiene `rev`. La acción `save` responde
`{ id, duplicate }` y el island solo distingue «Guardada» de un texto de error.

## Goals / Non-Goals

**Goals:**

- Que un guardado que llega tarde **no escriba nada** y se note.
- Que el cliente distinga conflicto de error sin mirar el texto de ningún mensaje.
- Que una factura ya guardada, sin `rev`, siga guardándose sin fricción y sin migración.
- Cero dependencias npm nuevas.

**Non-Goals:**

- Fusionar cambios, historial, tiempo real o bloqueo pesimista. Ver "Fuera de alcance" en
  `proposal.md`.
- Cambiar la clave de caché de navegación: ver el apartado correspondiente en `proposal.md`.

## Decisions

### 1. `rev` en la factura, igual que en la plantilla

**Elegido**: un contador entero en `IInvoiceData`, `applyRevision(input)` en la entidad, y la
comparación en el repositorio. Copia exacta del patrón de `Template`.

**Alternativa descartada — comparar el hash del contenido** con el `versionKey` que ya existe
del cambio anterior, evitando el campo nuevo por completo. Es tentador y es una línea menos,
pero se descarta por tres razones:

- ARCHITECTURE.md §7 **ya decidió** «bloqueo optimista por campo `rev`». Este cambio aplica una
  decisión existente, no la reabre.
- Un contador es legible por una persona: «tu revisión 4, la guardada es 7» dice cuántos
  guardados te has perdido. Un hash solo dice «distinto».
- Dos entidades editables con dos mecanismos distintos es un modelo mental de más para siempre,
  a cambio de un campo de menos una sola vez.

Obsérvese que esto **no contradice** la decisión de la caché del cambio anterior, que rechazó un
contador a favor de un hash. Son problemas distintos: una clave de caché la calcula el servidor
solo y un olvido produce contenido viejo en silencio; un candado optimista lo echa el cliente,
que necesita un valor que le devolvieron y que puede volver a mandar. Para eso el contador es la
herramienta, y el que se olvide de subirlo lo delata la prueba de conflicto, no un usuario.

### 2. El conflicto viaja como valor, no como excepción

**Elegido**: la acción responde `200` con `{ status: 'conflict', rev }`. No se lanza nada.

```ts
@action()
async save(input: SaveInvoiceDto): Promise<ISaveInvoiceReply> {
  // ...
  const result = await this.invoices.saveInvoice(input.id, payload, input.rev)
  if (result.status === 'conflict') return { status: 'conflict', rev: result.invoice.rev }
  return { status: 'saved', id, rev, duplicate }
}
```

**Alternativa descartada — lanzar un `409` como hace la plantilla.** Es lo que pide la simetría
y es justo lo que no hay que copiar: `callAction` tira el estado y el `code` (ver Context), así
que el island quedaría obligado a husmear el texto del mensaje, que es el fallo latente que este
cambio quiere dejar de propagar.

**El argumento de fondo**: un conflicto **no es un error**. Es una respuesta prevista a una
pregunta legítima —«¿puedo guardar sobre la revisión 4?»— cuya contestación es «no, va por la
7». Modelarlo como excepción obliga a reconstruir en el cliente una información que el servidor
ya tenía y tiró por el camino. El repositorio del proyecto ya lo trata como valor; aquí solo se
deja de romper esa forma al cruzar la frontera HTTP.

**Consecuencia que hay que atender**: `200` para un guardado que no guardó es contraintuitivo
leyendo solo el estado HTTP. Lo compensa que el campo `status` es obligatorio en la respuesta y
que el island debe mirarlo — la prueba de la tarea 3.3 fija justamente que un conflicto no se
confunde con un guardado correcto.

### 3. La comparación va dentro del `Locker`, no fuera

Leer la revisión, compararla y escribir son tres pasos; entre el primero y el tercero cabe otra
petición. `TemplateRepository` ya envuelve los tres en `this.locker.withKey('template:'+id)`, y
`InvoiceRepository` pasa a inyectar `Locker` para hacer lo mismo con `invoice:${id}`.

La ventana es pequeña —dos guardados en el mismo puñado de milisegundos— pero es exactamente el
escenario que el cambio dice resolver. Un candado optimista sin la sección crítica es un candado
que falla justo cuando se le necesita.

`ponytail:` techo asumido — el `Locker` en memoria es por proceso; con varias instancias haría
falta el `Locker` de Postgres, que el framework ya elige solo cuando hay `DATABASE_URL`. No hay
nada que anticipar.

### 4. Una factura sin `rev` se lee como 0

Hay filas guardadas antes de este cambio. **No se migra nada**: `get rev()` devuelve
`this.data.rev ?? 0`.

El cliente devuelve la revisión que recibió al abrir la factura. Para una factura vieja recibe
`0`, manda `0`, el servidor compara `0 === 0` y guarda dejándola en `1`. A partir de ahí es una
factura normal. Sin migración, sin script, sin fila especial.

**Alternativa descartada — una migración que rellene `rev: 1`** en todas las filas. Es un script
que hay que escribir, probar y ejecutar en el despliegue para conseguir exactamente lo mismo que
un `?? 0` consigue solo.

**El caso que hay que probar de verdad**: una factura vieja **sí** debe entrar en conflicto si
alguien la guardó entretanto. Si otra pestaña la guarda primero (`rev` pasa a 1) y la vieja
manda `0`, `0 !== 1` → conflicto. La cuenta sale, pero es el escenario donde un `??` mal puesto
pasaría desapercibido, así que lleva prueba propia (tarea 2.4).

### 5. Ante un conflicto, no se toca lo que la persona tiene escrito

El editor avisa y **conserva el formulario tal cual**. No recarga, no descarta, no sobrescribe
campos.

Recargar para «traer lo último» es la reacción que parece servicial y es la que destruye el
trabajo: quien lleva diez minutos escribiendo pierde los diez minutos para ver los cambios de
otro. El editor de plantillas ya acertó con esto —«Otro guardado se adelantó. Tus cambios siguen
aquí.»— y la factura copia esa postura.

Qué se ofrece: el aviso, y la revisión guardada, para que quien está delante decida si abre la
factura en otra pestaña, copia lo suyo o insiste. **Decidir es de la persona**, y con un solo
operador esto ocurrirá casi siempre entre dos pestañas suyas.

### 6. Sin dependencias npm nuevas

Regla del proyecto: justificar cada dependencia contra la alternativa nativa o ya instalada.
**No hay ninguna.** `Locker` y `CustomError` vienen del framework, `rev` es un número.
`package.json` no se toca.

### 7. La plantilla se alinea, en su propio grupo

`TemplateController.save` pasa a devolver `{ status, rev }` en vez de lanzar el `409`, y
`Editor.island.tsx` deja de husmear con `/409|revisi/i`.

Es una mejora adyacente, no lo que se pidió, y por eso vive en el grupo 5 de `tasks.md`: se
corta entero sin tocar nada de la factura. Se propone incluirlo porque la alternativa es dejar
un editor con detección tipada y el otro adivinando por el texto, y porque el husmeo actual
funciona por casualidad —el mensaje inglés contiene «revision»—, así que hoy ya es una prueba
que no protege nada.

**Riesgo de incluirlo**: es un cambio de contrato en una funcionalidad que hoy va bien. Se
mitiga con las pruebas existentes de `TemplateController` más una nueva de conflicto tipado.

## Risks / Trade-offs

- **Un `200` para un guardado que no guardó** → mitigación: el campo `status` es obligatorio en
  la respuesta y hay una prueba que fija que un conflicto no se confunde con un guardado bueno.
  Ver decisión 2.
- **Las facturas viejas sin `rev`** → mitigación: `?? 0` en el getter y una prueba dedicada,
  incluido el caso de que una factura vieja sí choque. Ver decisión 4.
- **Cambia la forma de la respuesta de `save`** → solo la consume el island propio; no hay
  integradores externos. Si el island se despliega desfasado del servidor, leería `status`
  indefinido: por eso el island trata «cualquier cosa que no sea `conflict`» como guardado, y no
  al revés.
- **Alinear la plantilla toca algo que funciona** → mitigación: grupo separado y cortable; ver
  decisión 7.
- **El candado es por proceso** → ver el techo de la decisión 3.
- **Esto no protege contra dos guardados de la misma pestaña** que se pisen a sí mismos, porque
  comparten la misma `rev` en memoria. No es el escenario del cambio y no se aborda.

## Migration Plan

1. Desplegar. **No hay migración de datos**: ninguna columna se añade —`rev` vive dentro del
   JSONB que ya se reescribe entero— y las filas sin revisión se leen como `0`.
2. El island y el servidor se despliegan juntos, como hasta ahora: es el mismo build.

**Vuelta atrás**: revertir el commit. Las facturas que hayan guardado un `rev` se quedan con un
campo que el código anterior ignora, y `applyChanges` lo pisará sin quejarse. No hay que limpiar
nada.

## Open Questions

Ninguna que bloquee.

La que aparecerá el día que haya **varios operadores** (cambio ya previsto y aplazado en
`app-auth`): con dos personas de verdad, el conflicto deja de ser «mis dos pestañas» y pasa a
ser «tu compañera y tú», y entonces sí valdrá la pena enseñar _quién_ se adelantó y _cuándo_.
Eso pide un campo de autoría que hoy no existe, y es su propio cambio.
