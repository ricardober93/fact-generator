## 1. La entidad Handoff

- [x] 1.1 Crear `src/invoice/models/handoff/Handoff.ts`: `IHandoffData` con `token`,
      `templateId`, `data`, `items`, `params` y `expiresAt` en milisegundos. Método
      `isExpired(now)`.
- [x] 1.2 Crear `HandoffRepository.ts` con `@repository({ table: 'handoff' })` y
      `@query() declare findOneByToken`.
- [x] 1.3 Generar el token con `Random.alphaNumeric(32)`, nunca con `Math.random()`.
- [x] 1.4 Constante nombrada `HANDOFF_TTL_MS` a 10 minutos.
- [x] 1.5 `createHandoff(templateId, data, items, params)`: carga la plantilla, falla si no
      existe, valida los datos contra su `dataSchema` con `missingRequiredPaths` y falla
      nombrando las rutas ausentes. Solo entonces guarda y devuelve el token.
      **Desviación:** el método no puede llamarse `create` — `CrudRepository` ya instala ese
      nombre y definirlo lo sustituiría, dejando al repositorio sin forma de guardar.
- [x] 1.6 `findValid(token, now)`: devuelve el handoff solo si existe y no ha caducado; un
      token inexistente y uno caducado devuelven lo mismo.
- [x] 1.7 `deleteExpired(now)` para la limpieza, sobre `deleteByExpiresAtLte`.
- [x] 1.8 `HandoffRepository.unit.test.ts` con `useMemoryRepositories()` y el `InMemoryLocker`
      registrado: creación y lectura; lectura repetida dentro de la ventana; lectura tras
      caducar; token desconocido; plantilla inexistente; datos incompletos nombrando las dos
      rutas; dos tokens seguidos no correlativos.

## 2. Limpieza periódica

- [x] 2.1 Crear `ExpireHandoffs.ts` con `@cronHandler({ name: 'expire-handoffs', cron: '0 3 * * *' })`
      que llame a `deleteExpired(Date.now())`.
- [x] 2.2 Implementar `handleError` para que un fallo quede en el log en vez de perderse.
- [x] 2.3 `ExpireHandoffs.unit.test.ts` con `createAsyncHarness().runCron(...)`: dos
      caducados desaparecen y uno vigente permanece.

## 3. Resolución de assets

- [x] 3.1 Crear `src/invoice/embedAssets.ts` con `assetsFor(doc, repository, params)`: recorre
      los bloques cuyo schema declara una propiedad de tipo `asset`, traduce la referencia a
      nombre de token, lee del tema el id guardado y pide solo esos assets por id.
- [x] 3.2 Devolver el mapa `nombreDeToken → data URI` que espera `render()`.
- [x] 3.3 Un asset referenciado que ya no existe se omite del mapa, sin fallar.
- [x] 3.4 `embedAssets.unit.test.ts`: se resuelve el referenciado; con cuatro assets en la
      base solo se lee el referenciado; el ausente no rompe.

## 4. El controlador del embed

- [x] 4.1 Crear `src/invoice/EmbedController.tsx` con `@uiController('/embed')`.
- [x] 4.2 `@action() prepare(input)`: DTO validado con `@isString`/`@isNotEmpty`, delega en
      el repositorio y devuelve `{ token }`. Dejar el hueco de `@uiMiddleware` documentado.
- [x] 4.3 `@view({ path: ':token' })`: carga el handoff válido, la plantilla y los assets,
      resuelve los parámetros y devuelve el documento renderizado. **Sin `static`.**
- [x] 4.4 Token caducado o desconocido: responder 404 con un aviso legible, idéntico en
      ambos casos.
- [x] 4.5 Capturar `MissingDataError` y pintar un aviso que nombre las rutas ausentes, sin
      trazas de pila ni rutas de archivos.
- [x] 4.6 Pasar los parámetros de la URL a `render()` tal cual: es el motor quien los
      contrasta con el schema de la plantilla. Los parámetros guardados en el handoff son la
      base y los de la URL mandan sobre ellos.

## 5. Auto-resize

- [x] 5.1 Crear `src/invoice/ui/EmbedFrame.island.tsx`: observa el alto del contenido con
      `ResizeObserver` y publica `postMessage` al padre al cargar y al cambiar.
      **Desviación:** el island **no envuelve** el documento. Al hidratar, un island se
      vuelve a pintar solo con sus props serializadas —`children` no viaja—, así que
      envolverlo borraría la factura en cuanto cargara el JavaScript. Mide `document.body` y
      no pinta nada. Tampoco publica nada cuando la página no está embebida
      (`window.parent === window`), donde el mensaje se lo mandaría a sí misma.
- [x] 5.2 Exportarlo por defecto con `island()`, como exige el bundler.
- [x] 5.3 Comprobar que el documento se ve completo aunque el island no hidrate.

## 6. Pruebas del controlador

- [x] 6.1 `EmbedController.unit.test.ts` con `createUiHarness`: `prepare` devuelve un token y
      abrir el embed con él pinta la factura.
- [x] 6.2 El HTML servido contiene el contenido de la factura y el CSS de impresión, sin
      depender de hidratación.
- [x] 6.3 Token caducado y token inexistente: ambos 404, con la misma respuesta.
- [x] 6.4 Dos tokens con datos distintos devuelven documentos distintos.
- [x] 6.5 Parámetro declarado aplicado; no declarado ignorado; valor inadmisible cae al
      valor por defecto y la respuesta sigue siendo 200.
- [x] 6.6 Un handoff con datos incompletos —creado saltándose `prepare`— produce el aviso
      que nombra la ruta, y la respuesta no contiene trazas de pila.
- [x] 6.7 Comprobar que la vista del embed no declara `static`.

## 7. Cierre

- [x] 7.1 `npm run tsc` sin errores.
- [x] 7.2 `npm run test:unit` en verde: 120 pruebas.
- [x] 7.3 `npm run fmt`.
- [x] 7.4 Comprobar que `src/invoice/render/` sigue sin importar la raíz del framework en
      archivos que no son tests ni fixtures.
- [x] 7.5 Arrancar `npm run dev`, abrir un embed real en el navegador y comprobar que el
      documento se ve y que Ctrl+P produce la factura.

      **Resultado:** el runner descubre el controlador (`GET /embed/:token`,
      `POST /embed/_action/prepare`), el bundler encuentra el island y el cron queda
      programado. `prepare` devuelve un token y el embed pinta la factura completa en
      Chromium, con el logo SVG servido como `<img src="data:image/svg+xml;base64,…">`.
      En media `print` el documento cae en una A4 con sus márgenes y el pie repetido al pie
      de página. Sin errores de consola.

      **Hallazgo, ajeno a este cambio:** el pie fijo se pinta a `left: 0` y ancho completo
      del papel, no dentro de la columna de 180 mm del documento, así que queda pegado al
      borde izquierdo en lugar de alineado con el resto. Es `renderPageFooter` en
      `render/bands.tsx`, del cambio `invoice-renderer` ya archivado — con esto queda
      contestada su tarea 8.5 pendiente. El pie **sí** se repite; lo que falla es su
      alineación horizontal.
