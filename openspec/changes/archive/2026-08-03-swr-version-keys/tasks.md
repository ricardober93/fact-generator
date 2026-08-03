## 1. La pieza que hashea

- [x] 1.1 `src/invoice/versionKey.ts`: `versionKey(parts: unknown)` — serializa y devuelve un
      hash corto con `createHash` de `node:crypto`, sin dependencias nuevas
- [x] 1.2 `versionKey.unit.test.ts`: mismo contenido da la misma clave, contenido distinto da
      claves distintas, y la clave es una cadena corta y estable entre llamadas

## 2. La clave de la factura

- [x] 2.1 `versionOfInvoice({ id })` en `InvoiceController.tsx`: lee la factura y su plantilla,
      y hashea `data`, `items`, `params`, `templateId`, `template.doc`, `template.rev` y el par
      `[id, nombre]` de cada plantilla que alimenta el selector
- [x] 2.2 Devolver una clave definida cuando la factura o la plantilla no existen, en lugar de
      lanzar: la vista ya responde 404 por su cuenta y la versión no debe romper antes
- [x] 2.3 Declarar `swr: { version: versionOfInvoice }` en el `@view({ path: ':id' })` de
      `InvoiceController`
- [x] 2.4 Tests de invalidación de `/invoices/:id` con `useMemoryRepositories()`, un caso por
      entrada de la clave: guardar datos distintos cambia la clave; editar el documento de su
      plantilla la cambia; crear otra plantilla la cambia; y no tocar nada **no** la cambia

## 3. La clave de la plantilla, que hoy está incompleta

- [x] 3.1 Ampliar `revisionOf` en `TemplateController.tsx` para que recoja también los ids de
      las imágenes disponibles, que la vista pinta en el selector y la clave de hoy ignora
- [x] 3.2 Tests de invalidación de `/templates/:id`: editar el documento cambia la clave; subir
      una imagen nueva la cambia —este es el bug de hoy, así que el test debe fallar antes del
      cambio 3.1 y pasar después—; y no tocar nada **no** la cambia

## 4. Que la regla se defienda sola

- [x] 4.1 Test estructural que recorre las vistas de `InvoiceController` y `TemplateController`
      por el `UiControllerMetadataStore` y exige que toda vista con parámetros de ruta declare
      `swr.version`, para que la siguiente ruta con `:id` no se quede sin clave en silencio
- [x] 4.2 Arrancar la aplicación y comprobar que el aviso
      `parameterized app views should declare swr.version` ya no aparece en el arranque

## 5. Comprobación de extremo a extremo

- [x] 5.1 Comprobar a mano el beneficio: navegar a una factura, volver a ella sin cambiar nada
      y ver que la respuesta es `304`; guardar datos distintos, volver, y ver que llega el
      contenido nuevo
- [x] 5.2 La corrección de la plantilla **no se puede comprobar a mano**: no existe ninguna
      ruta HTTP que suba una imagen —`AssetRepository.upload()` no lo llama ningún
      controlador—, así que el selector siempre está vacío y el fallo es latente. Queda cubierto
      donde sí es alcanzable, en `TemplateVersion.unit.test.ts`, que llama al repositorio
      directamente. Comprobar a mano solo lo que sí existe: que el editor revalida con `304`
      cuando no ha cambiado nada
- [x] 5.3 Puerta de calidad completa: `npm run tsc`, `npm run test:unit` y `npm run fmt:check`
      en verde
