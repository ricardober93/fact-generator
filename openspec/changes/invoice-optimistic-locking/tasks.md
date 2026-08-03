## 1. La revisión en la entidad

- [x] 1.1 `Invoice.ts`: añadir `rev` a `IInvoiceData` y el getter `get rev()` que devuelve
      `this.data.rev ?? 0`, para que una factura guardada antes de este cambio se lea como 0 sin
      migración
- [x] 1.2 `Invoice.ts`: `applyRevision(input)` que aplica los cambios y sube el contador en uno,
      como ya hace `Template.applyRevision`
- [x] 1.3 `Invoice.unit.test.ts`: una factura sin `rev` almacenado se lee como 0; `applyRevision`
      sube el contador y deja los datos nuevos

## 2. La comparación en el repositorio

- [x] 2.1 `InvoiceRepository.ts`: inyectar `Locker` en el constructor, junto al
      `TemplateRepository` que ya recibe
- [x] 2.2 `createInvoice` crea con `rev: 1`
- [x] 2.3 `saveInvoice(id, input, expectedRev)`: dentro de `this.locker.withKey('invoice:'+id)`,
      leer, comparar con la revisión almacenada y devolver `{ status: 'conflict', invoice }` sin
      escribir si no coinciden, o `{ status: 'saved', invoice }` tras `applyRevision` si coinciden
- [x] 2.4 Tests del repositorio, un caso por escenario del spec: la revisión que coincide guarda
      y sube el contador; la que se quedó atrás **no escribe nada** —comprobar que los datos
      almacenados siguen siendo los viejos, no solo que el estado sea `conflict`—; dos guardados
      desde el mismo punto de partida dejan pasar solo el primero; una factura sin `rev` se
      guarda mandando 0; y una factura sin `rev` que alguien guardó entretanto sí entra en
      conflicto

## 3. La acción, que devuelve el conflicto como valor

- [x] 3.1 `SaveInvoiceDto`: campo `rev` opcional y numérico, que solo se exige al actualizar
- [x] 3.2 `InvoiceController.save`: devolver `{ status: 'saved', id, rev, duplicate }` o
      `{ status: 'conflict', rev }` con `200`, sin lanzar ningún `409`
- [x] 3.3 Tests de la acción: guardar con la revisión buena responde `saved` y la revisión nueva;
      guardar con una vieja responde `conflict` con la revisión almacenada y **la factura no
      cambia**; y un conflicto no puede confundirse con un guardado correcto
- [x] 3.4 Comprobar que la clave de caché sigue correcta tras añadir `rev`: guardar cambia
      `versionOfInvoice` —ya lo cubre `InvoiceVersion.unit.test.ts`—, y **no** añadir `rev` a la
      clave, que hashea el contenido y ya cambia cuando cambia el contenido

## 4. El editor de facturas

- [x] 4.1 `InvoiceEditor.island.tsx`: guardar la revisión recibida en una señal, mandarla en cada
      guardado y actualizarla con la que devuelve un guardado correcto
- [x] 4.2 Tratar la respuesta: `status === 'conflict'` avisa y **no toca el formulario**;
      cualquier otra cosa se trata como guardado, para que un island desfasado no bloquee el
      trabajo
- [x] 4.3 Pasar la revisión almacenada desde `InvoiceController.edit` al island, para que el
      primer guardado tras abrir la factura ya lleve la buena
- [x] 4.4 Tests del editor: tras un conflicto los campos escritos siguen intactos y el aviso está
      visible; volver a guardar partiendo de la revisión almacenada se acepta

## 5. Alinear la plantilla (grupo cortable, ver decisión 7 del diseño)

- [x] 5.1 `TemplateController.save`: devolver `{ status, rev }` con `200` en lugar de lanzar el
      `409`, igual que la factura
- [x] 5.2 `Editor.island.tsx`: leer `status` y borrar el husmeo `/409|revisi/i`, que hoy acierta
      solo porque el mensaje inglés contiene «revision»
- [x] 5.3 Adaptar los tests existentes de `TemplateController` que esperan el `409`, y añadir uno
      que fije la detección tipada del conflicto

## 6. Cierre

- [x] 6.1 Comprobar a mano el recorrido con dos pestañas sobre la misma factura: guardar en la
      primera, guardar en la segunda, ver el aviso, comprobar que lo escrito en la segunda sigue
      ahí y que los datos de la primera no se han perdido
- [x] 6.2 Actualizar ARCHITECTURE.md §7 si hace falta: el bloqueo optimista por `rev` pasa de ser
      una regla que solo cumplía la plantilla a cumplirla también la factura
- [x] 6.3 Puerta de calidad completa: `npm run tsc`, `npm run test:unit` y `npm run fmt:check`
      en verde
