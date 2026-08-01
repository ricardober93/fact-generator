## 1. Precondiciones en el motor de render

- [x] 1.1 `render/bands.tsx`: `renderBand` emite `data-band` con el nombre de la banda y
      `renderBlock` emite `data-block` con el id del bloque. `renderBand` recibe el nombre como
      argumento; los atributos no cambian ningún estilo.
- [x] 1.2 `render/bands.tsx`: `renderPageFooter` deja de llevar `position: fixed` en línea y pasa
      a marcarse con una clase. En pantalla queda en flujo al final del documento.
- [x] 1.3 `render/printCss.ts`: emitir, junto a la regla `@page`, la regla de impresión del pie
      dentro de `@media print`, con `position: fixed`, `bottom: 0` y el ancho útil del documento
      —nunca el ancho del papel—, de modo que `left` resuelva a su posición estática.
- [x] 1.4 Reescribir las pruebas de `invoice-renderer` que afirmaban el `position: fixed`
      incondicional: el pie aparece una sola vez y sin `fixed` en línea; la hoja de estilo
      contiene la regla de impresión; el ancho declarado es el útil y no el del papel.
- [x] 1.5 Regenerar `render/__fixtures__/invoice.golden.html` y revisar el diff a mano: solo
      deben aparecer los atributos de datos y el cambio del pie.
- [x] 1.6 `render/blocks/defineBlock.ts`: tipar `Inspector` —hoy `unknown`— como componente
      opcional que recibe el bloque, el documento y una función de cambio. Sin `any`.
- [x] 1.7 Pruebas de `bands`/`printCss`: la banda lleva su nombre, cada bloque su id, dos bloques
      de la misma banda no comparten atributo.

## 2. Datos de muestra

- [x] 2.1 Crear `render/sampleData.ts` con `sampleDataFor(doc)`: un valor por cada ruta del
      `dataSchema` según su tipo (`string`, `number`, `boolean`, `date`) y un único item de
      detalle. Función pura, sin importar la raíz del framework.
- [x] 2.2 Las rutas anidadas (`cliente.nombre`) se materializan como objetos anidados, no como
      claves con punto.
- [x] 2.3 `sampleData.unit.test.ts`: cada tipo recibe un valor de su tipo; rutas anidadas; un
      `dataSchema` vacío devuelve una estructura vacía sin fallar; `render()` de un documento con
      rutas obligatorias no lanza `MissingDataError` con estos datos.

## 3. Estado del editor

- [x] 3.1 Crear `ui/editorStore.ts`: señales del documento, la revisión, la banda y el bloque
      seleccionados, y el estado de guardado.
- [x] 3.2 Mutaciones sobre el documento (mover, redimensionar, añadir bloque, cambiar propiedad,
      borrar bloque) como funciones puras `doc -> doc`, sin tocar el documento en sitio.
- [x] 3.3 Pila de deshacer/rehacer acotada con `structuredClone`: una entrada por cambio
      commitado; un cambio nuevo descarta lo rehacible.
- [x] 3.4 `editorStore.unit.test.ts`: tres cambios y dos deshacer; rehacer recupera; un cambio
      nuevo vacía la pila de rehacer; la pila no crece por encima de su tope; cada mutación
      devuelve un documento nuevo y deja intacto el anterior.

## 4. El lienzo

- [x] 4.1 Crear `ui/Canvas.tsx`: pinta `render({ doc, data: sampleDataFor(doc), items: [item] })`
      y superpone su capa de selección. No reimplementa el montaje del documento.
- [x] 4.2 Medir la escala píxel–milímetro del nodo del documento ya maquetado y rehacerla con
      `ResizeObserver`. Nunca asumir la constante de 96 dpi.
- [x] 4.3 Selección: `pointerdown` resuelve el bloque con `closest('[data-block]')` y la banda con
      `closest('[data-band]')`.
- [x] 4.4 Arrastre con `setPointerCapture`: durante el gesto solo se mueve el rectángulo
      provisional del overlay; el documento se escribe una vez en `pointerup`. `user-select: none`
      mientras dura.
- [x] 4.5 Redimensión por el tirador de la esquina inferior derecha, con el mismo modelo de
      gesto.
- [x] 4.6 Ajuste a milímetros enteros; el bloque queda contenido en su banda; ancho y alto nunca
      bajan del mínimo ni son negativos.
- [x] 4.7 Extraer la aritmética del gesto (píxeles + escala + rectángulo de banda -> bloque nuevo)
      a funciones puras en `ui/geometry.ts`, para poder probarla sin DOM.
- [x] 4.8 `geometry.unit.test.ts`: 10 mm a la derecha y 5 abajo dan el bloque esperado; a otra
      escala el resultado en milímetros es el mismo para la misma distancia física; el arrastre
      fuera de la banda se detiene en el borde; la redimensión invertida se queda en el mínimo.

## 5. La paleta

- [x] 5.1 Crear `ui/Palette.tsx`: lista los tipos que devuelve `blockKinds()`, sin lista propia.
- [x] 5.2 Insertar crea el bloque con `applyDefaults(kind)` en la banda seleccionada y lo deja
      seleccionado.
- [x] 5.3 Sin banda seleccionada, la inserción está deshabilitada en vez de adivinar una banda.
- [x] 5.4 Prueba: la paleta ofrece exactamente los tipos del registro; el bloque insertado tiene
      todas las propiedades de su schema y un id propio; se inserta en la banda seleccionada y no
      en otra.

## 6. El inspector

- [x] 6.1 Crear `ui/Inspector.tsx`: recorre el schema del tipo del bloque seleccionado y monta un
      editor por propiedad. Si la definición aporta `Inspector`, se usa ese.
- [x] 6.2 Crear `ui/propertyEditors.tsx` con un editor por `IPropType`: `string`, `number`,
      `boolean` y `enum:a,b,c`.
- [x] 6.3 Editor de `token`: desplegable de las claves de `doc.theme` que escribe la referencia
      `@clave`, nunca el valor literal del tema.
- [x] 6.4 Editor de `asset`: elige entre los assets existentes, que llegan como props del island.
      Subir queda fuera de alcance.
- [x] 6.5 Campos numéricos de geometría (`xMm`, `yMm`, `widthMm`, `heightMm`) para el valor
      exacto, con las mismas cotas que el arrastre.
- [x] 6.6 Prueba: un bloque sin `Inspector` propio produce un editor por propiedad de su schema;
      el `enum` solo ofrece sus valores; elegir un token escribe `@primary` y no el color;
      cambiar una propiedad no toca ninguna otra ni ningún otro bloque.

## 7. El editor de texto

- [x] 7.1 Crear `ui/TextContentEditor.tsx`: filas de fragmento, literal o binding, con las marcas
      (`bold`, `italic`, `underline`) y el formato del binding. Añadir, borrar y reordenar.
- [x] 7.2 La ruta de un binding se escribe con autocompletado de las rutas del `dataSchema`.
- [x] 7.3 Enlazar a una ruta que el `dataSchema` no declara la añade como
      `{ type: 'string', required: false }`. Enlazar a una ya declarada no la altera.
- [x] 7.4 Un literal se guarda como texto: el marcado que escriba el usuario nunca se convierte en
      elementos del documento.
- [x] 7.5 Prueba: literal y binding conviven en el mismo contenido; la ruta nueva queda declarada
      y opcional; la ruta ya declarada como obligatoria y numérica no cambia; un literal con
      caracteres de marcado se pinta como texto.

## 8. El controlador

- [x] 8.1 Crear `src/invoice/TemplateController.tsx` con
      `@uiController({ path: '/templates', app: true, layout })`. Dejar el hueco de
      `@uiMiddleware` documentado, como en `EmbedController`. **Sin `static` en ninguna vista.**
- [x] 8.2 `@view()` índice: lista de plantillas con nombre y revisión, y alta.
- [x] 8.3 `@view({ path: ':id' })` editor: carga la plantilla y monta el island con
      `{ id, doc, rev, assets }`. Plantilla inexistente: 404 legible.
- [x] 8.4 `@action() create(input)`: DTO validado, `createTemplate(name, emptyDocument())`,
      redirige al editor de la plantilla nueva.
- [x] 8.5 `@action() save(input)`: DTO validado con `{ id, doc, rev }`, delega en `saveDocument` y
      traduce `conflict` a `CustomError` con `httpCode: 409`. Devuelve la revisión nueva cuando
      guarda.
- [x] 8.6 Comprobar que el documento entero cabe en el límite de 100 kb del body de `@action` con
      un documento de tamaño realista, y dejar constancia del margen.

## 9. El island

- [x] 9.1 Crear `ui/Editor.island.tsx`: único `island()`, dueño del estado; monta paleta, lienzo e
      inspector como componentes suyos. Props serializables. **No envuelve contenido servidor.**
- [x] 9.2 Guardar con `callAction`/`actionUrl`; el conflicto se muestra sin descartar lo editado y
      sin recargar. Sin autoguardado.
- [x] 9.3 Atajos `Ctrl/Cmd+Z` y `Ctrl/Cmd+Shift+Z`, y borrar el bloque seleccionado con `Supr`.
      Los atajos no se disparan mientras el foco está en un campo del inspector.
- [x] 9.4 Comprobar que el documento se ve completo aunque el island no hidrate, y que ningún
      archivo de `ui/` pasa de 250 líneas.

## 10. Pruebas del controlador

- [x] 10.1 `TemplateController.unit.test.ts` con `createUiHarness`: `create` da de alta y el
      editor de esa plantilla responde 200 con el documento pintado.
- [x] 10.2 Guardado limpio: la revisión avanza y el documento almacenado es el enviado.
- [x] 10.3 Guardado contra una revisión vieja: 409, el documento almacenado no cambia.
- [x] 10.4 Documento inválido: no se escribe y la respuesta nombra los problemas.
- [x] 10.5 Plantilla inexistente: 404 legible, sin trazas de pila.
- [x] 10.6 Ninguna vista del controlador declara `static`.

## 11. Cierre

- [x] 11.1 `npm run tsc` sin errores.
- [x] 11.2 `npm run test:unit` en verde, incluidas las pruebas de `invoice-renderer` reescritas.
- [x] 11.3 `npm run fmt`.
- [x] 11.4 Comprobar que `render/` sigue sin importar la raíz del framework fuera de tests y
      fixtures, y que el island bundlea sin arrastrarla.
- [x] 11.5 Ningún archivo pasa de 250 líneas y ninguna función de 25, salvo casos justificados.
- [x] 11.6 Arrancar `npm run dev` y comprobar en el navegador: crear plantilla, insertar bloques
      de los cuatro tipos, arrastrarlos y redimensionarlos, editar propiedades y texto, deshacer,
      guardar, y provocar un conflicto guardando desde dos pestañas. Ctrl+P sigue produciendo la
      factura con el pie al pie de cada página y alineado con la columna.
- [x] 11.7 Abrir un embed del mismo documento y comprobar que el editor y el embed pintan lo
      mismo.

      **Resultado de 11.6 y 11.7, comprobado en Chromium contra `npm run dev`:**

      El runner descubre el controlador (`GET /templates`, `GET /templates/:id`,
      `POST /templates/_action/{create,save}`) y bundlea los dos islands. Sin errores ni avisos
      de consola tras recargar.

      - **Alta y edición:** `create` redirige al editor de la plantilla nueva. Con banda
        seleccionada se insertan los cuatro tipos; sin banda, la paleta está deshabilitada.
      - **Arrastre:** un desplazamiento de 37,795 px con la escala medida (3,7795 px/mm) escribe
        exactamente `xMm 0→10` y `yMm 0→5`. La escala medida coincide con la constante de CSS a
        zoom 1, que es lo esperado, y se remide al cambiar el tamaño.
      - **Inspector:** el panel se deriva del schema (las cinco propiedades de `text`, las cuatro
        de `box`) más la geometría; los tokens se guardan como `@surface`/`@border`.
      - **Texto y bindings:** enlazar a `cliente.nif` —no declarada— la añade al `dataSchema` y
        aparece acto seguido en el autocompletado.
      - **Deshacer/rehacer:** un cambio se deshace y se rehace sin perder el resto.
      - **Guardado y conflicto:** guardar avanza a `rev 2`; con otro guardado por delante, el
        editor responde «Otro guardado se adelantó», **conserva lo editado en pantalla** y no
        toca su revisión.
      - **Pie:** en pantalla `position: static`, alineado con la columna. Aplicando la regla de
        impresión, `position: fixed` con `left = 524 px` (el borde de la columna, no el del papel)
        y `width = 680 px = 180 mm`. Queda cerrada la desalineación que dejó pendiente
        `invoice-renderer`.
      - **Paridad editor/embed (11.7):** con los mismos datos, el marcado del documento es
        **idéntico byte a byte** en las dos superficies — 4221 bytes, cinco bandas, catorce
        bloques. Es la comprobación directa de que no hay un segundo motor de render.

## 12. Desviaciones

- **12.1 `renderBand` recibe el nombre de la banda como argumento.** Emitir `data-band` exigía
  que la función supiera qué banda pinta; antes solo recibía la banda y el contexto. Cambio
  interno de `render/`, sin efecto en la firma pública de `render()`.
- **12.2 El editor de `asset` escribe el tema, no la propiedad del bloque.** Una propiedad de
  tipo `asset` guarda una referencia a token (`@logo`) y es el tema quien mapea ese token al id
  del asset. Editar el bloque habría roto la regla de que un bloque nunca guarda un literal, así
  que el editor elige qué asset resuelve el token y escribe `doc.theme[token]`.
- **12.3 `findAll()` está mal tipado en el framework.** El `.d.ts` declara `findAll(id: string)`
  mientras que las tres implementaciones —memoria, PG y el decorador— no reciben argumentos. Se
  corrige con un `declare findAll: () => Promise<T[]>` en cada repositorio, que es solo tipo y no
  emite nada, así que `installCrudMethods` sigue instalando el método real.
- **12.4 La vista `:id` declara `swr.version`.** El runner avisaba de que una vista
  parametrizada de un controlador `app: true` debe declararla. Se keya por la revisión
  almacenada, que es la semántica correcta para un editor: un 304 solo mientras nadie haya
  guardado.
- **12.5 El 404 de plantilla desconocida lleva traza de pila en desarrollo.** Es la página de
  error del framework, que incluye el stack cuando `NODE_ENV !== 'production'`. La prueba afirma
  el texto legible, igual que la del embed; no se marca `static` ninguna vista.
- **12.6 Un solo tirador de redimensión.** Esquina inferior derecha, como anticipaba el diseño.
  El inspector cubre el valor exacto de `x/y/ancho/alto`.
- **12.7 `validateDocument.ts` tiene 333 líneas**, por encima del límite de 250 de CLAUDE.md. Es
  anterior a este cambio y no se ha tocado.
