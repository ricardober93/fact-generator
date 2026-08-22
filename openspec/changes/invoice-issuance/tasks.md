## 1. El rango de numeración

- [x] 1.1 `models/numberRange/NumberRange.ts`: entidad con `docType`, `prefix`, `from`, `to`,
      `next`, `validFrom`, `validTo` —identificadores en inglés, como manda CLAUDE.md; el español
      se queda donde es contrato, en las rutas de datos de la plantilla—. Getters, sin lógica de
      emisión: el rango sabe decir si está vigente, si está agotado y si un número le pertenece
- [x] 1.2 `models/numberRange/NumberRangeRepository.ts`: `createRange` que rechaza extremos
      imposibles (`hasta < desde`) y **solapamiento** con otro rango del mismo `docType` y prefijo;
      `findUsable(docType, at)` que devuelve los vigentes y no agotados
- [x] 1.3 `NumberRange.unit.test.ts`: vigencia dentro y fuera, agotado y no agotado, pertenencia de
      un número
- [x] 1.4 `NumberRangeRepository.unit.test.ts`: un rango solapado se rechaza y el existente no
      cambia; dos tramos disjuntos con el mismo prefijo conviven; el mismo tramo para otro
      `docType` se acepta; extremos imposibles se rechazan

## 2. El documento gana tipo y estado

- [x] 2.1 `Invoice.ts`: añadir a `IInvoiceData` los campos `docType`, `status`, `prefix`, `number`,
      `issuedAt`. Getters con el mismo truco que `rev`: sin `estado` se lee `borrador`, sin
      `docType` se lee `factura`, para que un documento guardado antes de este cambio se abra sin
      migración
- [x] 2.2 `Invoice.ts`: `get emitida()` y un `issue(...)` que escribe prefijo, número e instante,
      pone el estado y **también** escribe el número dentro de `data` en `INVOICE_NUMBER_PATH`
      (decisión 2 del diseño: el campo se consulta, la ruta se pinta)
- [x] 2.3 `Invoice.unit.test.ts`: un documento sin `estado` ni `docType` se lee como borrador y
      factura; `issue` deja los cinco campos y sobrescribe la ruta de número aunque ya tuviera un
      valor tecleado

## 3. La aritmética que se comprueba al emitir

- [x] 3.1 `models/invoice/checkArithmetic.ts`: función pura que recibe `data` e `items` y devuelve
      los desajustes encontrados —línea a línea, base y total— usando las rutas de
      `render/invoiceFields.ts` y los enteros de céntimos de `render/money.ts` para comparar —la
      misma aritmética que calculó el formulario, ver decisión 7—. Comprueba **solo lo que el documento
      lleva**; los impuestos ausentes valen cero. Vive fuera de `render/`, que no puede importar la
      raíz del framework
- [x] 3.2 `checkArithmetic.unit.test.ts`: línea que no cuadra; base que no cuadra; total que no
      cuadra; sin impuestos declarados cuadra; sin base ni total no comprueba nada; céntimos que en
      coma flotante darían cola decimal

## 4. Emitir

- [x] 4.1 `InvoiceRepository.issueInvoice(id, { numero? })`: dentro del `Locker` por
      `invoice:<id>` que ya se usa al guardar. Si ya está emitida, **devolverla tal cual** sin
      consumir consecutivo —es toda la idempotencia que hace falta (decisión 5)—
- [x] 4.2 Dentro de esa misma operación: comprobar la aritmética y abortar sin consumir nada si
      falla; después tomar el número, bajo `Locker` por `range:<id>` (orden de bloqueo siempre
      factura → rango, para que no haya ciclo)
- [x] 4.3 Asignación del número: sin número dado, el siguiente del primer rango utilizable y el
      puntero avanza; con número dado, comprobar pertenencia a un rango vigente, comprobar que está
      libre (consulta por `docType` + `prefijo` + `numero`, ahora que son campos), y avanzar el
      puntero solo si el número lo alcanza o lo pasa
- [x] 4.4 Motivos de rechazo nombrados y distinguibles: sin rango, rango agotado, rango caducado,
      número ocupado, número fuera de rango, prefijo ambiguo, aritmética que no cuadra. Viajan como
      **valor tipado** en el resultado, no como `CustomError`: un rechazo previsto es la respuesta
      normal a una pregunta legítima, igual que se decidió para el conflicto de guardado. Solo lo
      excepcional —id ausente, documento inexistente, escribir sobre una emitida— lanza
- [x] 4.5 `findByNumero` deja de ser `findAll()` + filtro en memoria y pasa al DSL `@query` sobre
      los campos nuevos
- [x] 4.6 `InvoiceRepository.unit.test.ts`: un caso por escenario de `invoice-issuance` y
      `invoice-numbering` — emitir dos veces no consume dos consecutivos; dos emisiones seguidas no
      repiten número; aritmética mala no consume consecutivo **y comprobar que el puntero del rango
      no se movió**; número por delante adelanta el puntero; hueco hacia atrás no lo mueve; número
      ocupado y fuera de rango se rechazan; sin rango vigente se rechaza

## 5. La congelación

- [x] 5.1 `InvoiceRepository.saveInvoice`: si el documento está emitido, rechazar **sin escribir
      nada**. Va en el repositorio, no en el controlador: es el punto por el que pasan la acción, el
      island y cualquier llamador futuro
- [x] 5.2 Tests: guardar sobre un emitido no cambia ni un campo; llamar al repositorio directamente
      se rechaza igual; guardar un borrador sigue funcionando exactamente como antes

## 6. La nota de crédito

- [x] 6.1 `Invoice.ts`: campo `corrige` con el id, el prefijo y el número del documento corregido.
      Se guarda el número además del id para que el papel lo pinte sin ir a buscar el otro documento
- [x] 6.2 `issueInvoice` para `docType: 'notaCredito'`: toma el rango de notas de crédito, nunca uno
      de facturas; exige que el documento referenciado exista y esté **emitido**; no toca ese
      documento
- [x] 6.3 `motivo` obligatorio: campo en la entidad y rechazo de la emisión si viene vacío. Texto
      libre, sin catálogo de conceptos
- [x] 6.4 Crear una nota de crédito **desde** una factura emitida: el borrador nace con sus datos,
      sus líneas y la referencia ya puestas, y todo eso es editable para dejar la corrección parcial
- [x] 6.5 Tests: no consume consecutivo de facturas; sin rango propio se rechaza; referenciar un
      borrador se rechaza; sin motivo se rechaza; la factura corregida conserva datos, estado y
      número; partir de una factura de tres líneas trae las tres y quitar dos deja una

## 7. La interfaz

- [x] 7.1 `invoiceForm.ts`: excluir `INVOICE_NUMBER_PATH` de los campos editables, dejándolo en el
      `dataSchema` para que la plantilla lo siga pintando. Test: el formulario no ofrece casilla de
      número
- [x] 7.2 `InvoiceEditor.island.tsx`: si el documento está emitido, campos y líneas en solo lectura
      y sin acción de guardar; si es borrador, todo igual que hoy
- [x] 7.3 Acción y botón de **emitir** en `InvoiceController.tsx`, con campo opcional de número.
      Devuelve el resultado como valor tipado —`emitida` / el motivo del rechazo—, igual que el
      conflicto de guardado: nada de deducir el fallo del texto del mensaje
- [x] 7.4 `InvoiceList.tsx`: columnas de tipo, estado y número; un borrador se ve sin número y
      marcado como tal
- [x] 7.5 Impresión: en un documento emitido cuyo `dataFit` detecta caminos obligatorios ausentes,
      impedir imprimir y nombrarlos; en un borrador, seguir avisando sin impedir
- [x] 7.6 Pantalla mínima de rangos —listar y crear—, sin editar ni borrar: sin ella no se puede
      emitir el primer documento y la única alternativa sería tocar la base a mano
- [x] 7.7 Tests de UI con `createUiHarness`: emitido en solo lectura, borrador editable, la acción
      de emitir devuelve su resultado tipado, la lista distingue borrador de emitida

## 8. La clave de caché

- [x] 8.1 `versionOfInvoice`: añadir `estado` y `numero` a lo que se hashea. Hoy funcionaría de
      rebote —emitir escribe el número dentro de `data`, que ya está en la clave—, y depender de ese
      rebote es justo el tipo de corrección accidental que se rompe sin que falle ningún test
- [x] 8.2 `InvoiceVersion.unit.test.ts`: emitir cambia la clave; dos documentos con los mismos datos
      y distinto estado tienen claves distintas

## 9. Cierre

- [ ] 9.1 **Pendiente de manos humanas.** Recorrido a mano: crear un rango, crear un borrador, intentar emitirlo con los totales
      descuadrados, corregirlos, emitirlo, comprobar que ya no se edita, retocar un color de la
      plantilla y volver a abrirlo para ver que el retoque le alcanza y sus datos no cambian
- [ ] 9.2 **Pendiente de manos humanas** (el equivalente automático ya está en
      `CreditNotes.unit.test.ts` y en `InvoiceIssuanceUi.unit.test.ts`). Emitir una nota de crédito **desde** esa factura con su motivo, comprobar que llega con
      las líneas puestas y que la factura corregida no cambia en nada
- [x] 9.3 Actualizar ARCHITECTURE.md: el documento deja de ser solo presentacional. Escribir **qué
      entró** (estado, consecutivo con rango y vigencia, congelación) y **qué sigue fuera** (XML,
      firma, CUFE, QR, catálogos), para que la línea siga siendo una decisión y no una ambigüedad
- [x] 9.4 Puerta de calidad completa: `npm run tsc`, `npm run test:unit` y `npm run fmt:check` en
      verde
