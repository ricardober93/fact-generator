## Why

`invoice-template-model` dejó el documento definido, validado y guardado, pero nadie lo
pinta todavía. Sin motor de render no hay embed que enseñar ni preview que editar: las dos
superficies del producto están bloqueadas por esta pieza.

El motor es además el punto donde se cobra la promesa que sostiene toda la arquitectura —
que el preview del editor y el render del embed no puedan divergir— porque va a ser
literalmente la misma función corriendo en Node y en el navegador.

## What Changes

- **`render(doc, data, params, assets)`**: función pura e isomorfa que convierte un
  documento y sus datos en JSX. Sin IO, sin acceso a repositorios, sin `Date.now()`.
- **Bandas a estructura paginable**: `detailHeader` como `<thead>` para que el navegador
  repita la cabecera en cada página impresa, `detail` como una fila por ítem, `pageFooter`
  como `position: fixed` para que aparezca en cada página. La paginación la hace el
  navegador; no escribimos motor propio.
- **Tokens a CSS custom properties**: el tema resuelto se emite como variables CSS en la
  raíz del documento, así que un parámetro del iframe repinta sin tocar ningún bloque.
- **Render de los cuatro bloques**: `text`, `image`, `box` y `line` estrenan su función
  `render`, que hasta ahora era un hueco declarado en `IBlockDefinition`.
- **Resolución de datos**: los fragmentos de tipo `binding` resuelven rutas como
  `cliente.nombre` o `items[0].total` contra los datos, con filtros de formato.
- **Contrato de datos declarado**: el documento gana un `dataSchema` que enumera las rutas
  que consume y cuáles son obligatorias. **BREAKING** para `IDocument`, aunque sin datos en
  producción que migrar.
- **Locale y moneda**: declarados en el documento y sobreescribibles por parámetro del
  embed. Formateo con `Intl`, que es nativo e isomorfo.
- **CSS de impresión**: `@page { size; margin }` derivado de la página del documento.
- **Sin dependencias npm nuevas.** En pantalla el documento es papel continuo; los saltos
  reales se ven en Ctrl+P.

## Capabilities

### New Capabilities

- `invoice-renderer`: cómo un documento se convierte en marcado. Estructura de bandas y su
  cardinalidad en el HTML, geometría en milímetros, tokens como variables CSS, render de
  cada tipo de bloque, comportamiento en impresión y garantía de que el mismo documento
  produce el mismo marcado en Node y en el navegador.

- `invoice-data-binding`: cómo el documento consume datos. Resolución de rutas, contrato de
  rutas obligatorias y opcionales, qué ocurre cuando falta un dato, filtros de formato, y
  la procedencia del locale y la moneda.

### Modified Capabilities

- `invoice-document-model`: la estructura del documento pasa a incluir el `dataSchema`. Es
  el único requisito que cambia; las bandas, las unidades y los tokens siguen igual.

## Impact

**Código nuevo**:

```
src/invoice/render/render.tsx           render(doc, data, params, assets) → JSX
src/invoice/render/bands.tsx            bandas → thead / filas / fixed
src/invoice/render/bind.ts              rutas, filtros, contrato de datos
src/invoice/render/format.ts            Intl para números, moneda y fechas
src/invoice/render/printCss.ts          @page y variables CSS del tema
```

**Código modificado**:

```
src/invoice/render/blocks/*.ts → *.tsx  cada bloque estrena su render
src/invoice/render/document.ts          + dataSchema, + locale, + currency
src/invoice/render/validateDocument.ts  + validación del dataSchema
```

**Dependencias**: ninguna nueva. `Intl.NumberFormat` e `Intl.DateTimeFormat` son nativos y
funcionan igual en Node y en el navegador; `Money` del framework no sirve aquí porque vive
en la raíz del paquete, que `render/` no puede importar.

**Aguas abajo**: `embed-iframe` monta este render en una ruta y `template-builder` lo monta
en un island. Ninguna de las dos vuelve a implementar nada de esto.

**Aguas arriba**: `Template` guarda documentos que ahora llevan `dataSchema`. Los
documentos existentes son de test, así que el campo se añade con un valor por defecto vacío
y `emptyDocument()` lo produce ya relleno.

## Fuera de alcance

Este cambio **no reabre** ninguna decisión cerrada, y en concreto:

- **No hay rutas HTTP ni controladores.** El motor es una función; quien la llama por HTTP
  es `embed-iframe`.
- **No hay drag-and-drop, ni inspector, ni paleta.** El campo `Inspector` de
  `IBlockDefinition` sigue vacío hasta `template-builder`.
- **No hay paginación en pantalla.** Papel continuo; el corte real solo en Ctrl+P. Sin
  paged.js, sin cálculo propio de cuántos ítems caben por hoja.
- **No hay PDF de servidor**: el único PDF sigue siendo Ctrl+P del navegador.
- **Sigue sin haber dominio fiscal**: nada de XML, firma digital, CUFE ni catálogos.
- **No se tocan los assets**: se siguen pintando como `<img src="data:...">` y nunca
  inlineando markup SVG.
- **No se añade capa de servicios, ni barrels, ni test de arquitectura.**
- **`render/` sigue sin importar la raíz del framework**: solo `@wabot-dev/framework/ui`.
