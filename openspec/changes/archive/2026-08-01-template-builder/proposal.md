## Why

De las dos superficies del producto solo existe una. El embed pinta documentos, pero no hay
forma de crear uno: `TemplateRepository.createTemplate()` solo se invoca desde los tests, así
que hoy la única manera de tener una plantilla es escribir su JSON a mano. El editor de
cajitas es la superficie que falta, y es también la que justifica que el motor de render sea
isomorfo: el preview del editor tiene que ser exactamente el mismo `render()` que sirve el
embed, o las dos superficies divergen.

La capa de almacenamiento ya está lista y no se toca: `saveDocument(id, doc, expectedRev)`
resuelve el bloqueo optimista con `Locker` y devuelve `conflict` sin escribir. `applyDefaults`
ya compone un bloque nuevo desde su `kind`. Lo que falta es la superficie.

## What Changes

- **Nuevo `TemplateController`** en `/templates`, con navegación boosted (`app: true`): índice
  con la lista de plantillas, página de editor por `:id`, y las acciones `create` y `save`.
- **Un único island, `Editor.island.tsx`**, dueño del documento en memoria. Paleta, lienzo e
  inspector son componentes suyos, no islands hermanos: comparten el documento por señal, y
  un island hermano no podría leerlo. El island recibe `{ id, doc, rev }` como props
  serializables y repinta el documento él mismo llamando a `render()`.
- **Lienzo con arrastre y redimensión** en milímetros, relativos a la banda del bloque. La
  escala px↔mm se mide del propio lienzo, no se asume el 96dpi de CSS, para que sobreviva al
  zoom del navegador.
- **Inspector dirigido por el schema**: `IBlockSchema` ya declara el tipo de cada propiedad
  (`string`, `number`, `boolean`, `token`, `asset`, `text`, `enum:a,b,c`). Un editor por tipo
  cubre los cuatro bloques existentes sin escribir un inspector por bloque. El `Inspector`
  propio de una definición pasa a ser el caso excepcional, no el obligatorio.
- **Datos de muestra derivados del `dataSchema`**: `render()` lanza `MissingDataError` si falta
  una ruta obligatoria, así que el lienzo necesita valores representativos para pintar. Se
  derivan del propio schema; no hay fixture de datos en el editor.
- **Guardado con conflicto visible**: `save` traduce el `conflict` que ya devuelve el
  repositorio a un 409 que el editor muestra sin perder lo editado.
- **Deshacer/rehacer** por pila de instantáneas del documento, acotada. El documento es JSON
  plano, así que la instantánea es la estructura entera.
- **BREAKING (marcado, no roto en la práctica)**: el pie de página deja de emitirse con
  `position: fixed` en pantalla; pasa a ser fijo solo bajo `@media print`. Es requisito previo
  del lienzo —un pie fijo se escaparía del papel y se pegaría al viewport del editor— y de paso
  corrige que hoy se pinta a `left: 0` sobre el ancho completo del papel en vez de alineado con
  la columna del documento. Contesta la tarea 8.5 que quedó pendiente en `invoice-renderer`.

## Capabilities

### New Capabilities

- `template-editor`: la superficie de edición. Lienzo que pinta el documento con el mismo
  `render()` del embed, selección y geometría por arrastre en milímetros relativos a la banda,
  paleta que instancia tipos del registro, inspector dirigido por el schema del bloque,
  guardado con bloqueo optimista y conflicto visible, y deshacer/rehacer.

### Modified Capabilities

- `invoice-renderer`: el pie de página se emite fijo **solo en impresión** y alineado con la
  columna útil del documento, no con el borde del papel. En pantalla queda en flujo.
- `invoice-document-model`: el componente `Inspector` de una definición de bloque pasa a ser
  **opcional**. El schema de propiedades es el contrato que dirige la edición; una definición
  solo aporta `Inspector` cuando su propiedad no se deja editar por tipo.

## Impact

- **Código nuevo**: `src/invoice/TemplateController.tsx`, `src/invoice/ui/` (island del editor,
  lienzo, paleta, inspector y sus editores por tipo, layout del área), y una función de datos
  de muestra en `src/invoice/render/`.
- **Código modificado**: `render/bands.tsx` y `render/printCss.ts` por el pie; el golden fixture
  `render/__fixtures__/invoice.golden.html` y las pruebas de `invoice-renderer` que afirman el
  `position: fixed` incondicional; `render/blocks/defineBlock.ts` para tipar el `Inspector` que
  hoy es `unknown`.
- **Sin código nuevo de persistencia**: `TemplateRepository` ya expone lo que el editor necesita.
- **Sin dependencias npm nuevas.** El arrastre son Pointer Events nativos; el atajo de deshacer
  es un `keydown`; no entra ninguna librería de drag-and-drop ni de estado.
- **Límite de 100 kb del body de `@action`**: el documento viaja entero en cada guardado. Cabe
  porque los logos son ids de `Asset`, nunca base64 dentro del documento.

## Fuera de alcance

Este cambio **no** reabre ninguna decisión cerrada:

- **No hay paginación en pantalla.** El lienzo es papel continuo; el corte real se sigue viendo
  solo en Ctrl+P. No entra paged.js.
- **No hay PDF de servidor.** Ni Chrome headless, ni Gotenberg, ni endpoint de PDF.
- **No se sube ningún logo.** El editor de propiedades `asset` elige entre los assets que ya
  existen en la base. La normalización en cliente con canvas y la subida son el cambio
  `asset-upload`, que el usuario dejó explícitamente para después. Un asset se sigue guardando
  en base64 en su propia entidad, nunca dentro del JSON del documento.
- **No se decide quién entra a `/templates`.** La autenticación sigue siendo la decisión
  abierta que ya bloquea `prepare` del embed; aquí solo se deja el hueco de `@uiMiddleware`
  documentado, igual que en `EmbedController`. `/templates` **nunca** se marca `static`.
- **No entra dominio fiscal.** Sin XML, sin firma, sin QR/CUFE, sin catálogos.
- **No se cambia el modelo de bandas ni las unidades.** Cinco bandas, milímetros, coordenadas
  relativas a la banda, y bloques que referencian tokens (`@primary`) en vez de literales.
- **No se añade un segundo motor de render.** El lienzo llama a `render()`; si el preview
  necesitara algo que `render()` no hace, se cambia `render()`, no se escribe un preview aparte.
- **Sin barrels, sin carpeta `shared/`, sin capa de servicios** sobre el repositorio.
