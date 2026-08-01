## 1. Ampliar el modelo del documento

- [ ] 1.1 Añadir a `IDocument` los campos `dataSchema: IDataPath[]`, `locale: string` y
      `currency: string`. Un `IDataPath` lleva `path`, `type` y `required`.
- [ ] 1.2 Actualizar `emptyDocument()`: `dataSchema` vacío, `locale` `'es-ES'`, `currency`
      `'EUR'`.
- [ ] 1.3 Extender `validateDocument`: los tres campos son obligatorios, y toda ruta usada
      en un fragmento de tipo binding debe estar declarada en `dataSchema`.
- [ ] 1.4 Actualizar el fixture `__fixtures__/invoiceDocument.ts` con su `dataSchema` real
      (emisor, cliente, factura, item) y ampliar `document.unit.test.ts` con los dos casos
      nuevos: documento sin `dataSchema` inválido, ruta usada sin declarar inválida.

## 2. Resolución de datos

- [ ] 2.1 Crear `render/bind.ts` con `resolvePath(data, path)`: puntos para objetos
      anidados, `[n]` para índices, y ausencia distinguible de valor `null` o `undefined`.
- [ ] 2.2 Implementar `resolveBindings(doc, data, scope)`: devuelve el valor de cada ruta y
      la lista de rutas obligatorias ausentes. Un valor presente pero `null` cuenta como
      ausente.
- [ ] 2.3 Dentro de la banda `detail`, resolver contra el ítem en curso bajo la raíz `item`,
      de modo que la misma ruta sirva para todas las repeticiones.
- [ ] 2.4 `bind.unit.test.ts`: ruta anidada, índice de colección, ruta que atraviesa un
      valor inexistente sin lanzar, opcional ausente resuelta como vacío, y las tres rutas
      obligatorias ausentes reportadas juntas.

## 3. Formato

- [ ] 3.1 Crear `render/format.ts` con `formatValue(value, format, locale, currency)` sobre
      `Intl.NumberFormat` e `Intl.DateTimeFormat`. Formatos: `currency`, `number`, `date`,
      `percent`.
- [ ] 3.2 Un formato no reconocido devuelve el valor sin formatear; un valor no numérico con
      formato numérico se devuelve tal cual, nunca `NaN`.
- [ ] 3.3 Resolver locale y moneda efectivos: los del documento, sobreescritos por los
      parámetros que el propio documento declare.
- [ ] 3.4 `format.unit.test.ts` cubriendo los cuatro formatos, el formato desconocido, el
      valor no numérico y la sobreescritura por parámetro.

## 4. Tema como custom properties

- [ ] 4.1 Crear `render/printCss.ts` con `themeCss(theme)`: el tema resuelto a declaraciones
      `--token: valor` para el contenedor raíz.
- [ ] 4.2 Añadir `pageCss(page)`: `@page { size: <ancho>mm <alto>mm; margin: … }` derivado
      de la página del documento.
- [ ] 4.3 `printCss.unit.test.ts`: cada token del tema aparece como custom property; el
      `@page` refleja tamaño y márgenes en mm.

## 5. Render de los bloques

- [ ] 5.1 Renombrar los cuatro bloques de `.ts` a `.tsx` y añadir su `render(block, ctx)`.
      El contexto trae el valor ya resuelto y formateado, el tema y los assets.
- [ ] 5.2 `text.tsx`: fragmentos como nodos JSX, marcas `bold`/`italic`/`underline`.
      Prohibido `dangerouslySetInnerHTML`. Colores y tipografía vía `var(--…)`.
- [ ] 5.3 `image.tsx`: resuelve el asset y emite `<img src="data:...">`. Nunca markup SVG.
      Un asset ausente deja un hueco del tamaño declarado, sin `<img>`.
- [ ] 5.4 `box.tsx` y `line.tsx`: relleno, borde y grosor en mm, todo por custom properties.
- [ ] 5.5 `blocks.unit.test.ts`: los cuatro tipos producen marcado no vacío; un `kind`
      desconocido falla nombrándolo; un fragmento con `<script>` sale escapado; un SVG con
      script sale como `<img>` y nunca como etiqueta `<svg>`.

## 6. Composición de bandas

- [ ] 6.1 Crear `render/bands.tsx`: cada banda es un contenedor `position: relative` con su
      alto en mm, y sus bloques `position: absolute` con coordenadas relativas a la banda.
- [ ] 6.2 Emitir `detailHeader` dentro de `<thead>` y una repetición de `detail` por ítem
      dentro de `<tbody>` de la misma tabla.
- [ ] 6.3 Emitir `pageFooter` una sola vez en un contenedor `position: fixed`.
- [ ] 6.4 `bands.unit.test.ts`: tres ítems producen tres repeticiones de `detail` y una sola
      de `header` y `summary`; la colección vacía no rompe; `detailHeader` queda en `thead`.

## 7. La función de render

- [ ] 7.1 Crear `render/render.tsx` con `render(doc, data, params, assets)`: resuelve tema,
      locale y bindings, y compone raíz, bandas y CSS.
- [ ] 7.2 Fallar con un error que nombre **todas** las rutas obligatorias ausentes antes de
      emitir marcado.
- [ ] 7.3 `render.unit.test.ts`: renderizar dos veces produce salidas idénticas; no muta
      entradas; dos renders que solo difieren en parámetros producen el mismo marcado de
      bloques y distinta custom property; un obligatorio ausente falla nombrando la ruta.
- [ ] 7.4 Golden test sobre `__fixtures__/invoiceDocument.ts` con datos de ejemplo: fija el
      marcado completo de una factura de tres ítems.

## 8. Cierre

- [ ] 8.1 `npm run tsc` sin errores.
- [ ] 8.2 `npm run test:unit` en verde.
- [ ] 8.3 `npm run fmt`.
- [ ] 8.4 Comprobar que ningún archivo bajo `src/invoice/render/` importa
      `@wabot-dev/framework` sin el sufijo `/ui`.
- [ ] 8.5 Comprobar en Chrome y en Firefox que el pie `position: fixed` se repite al
      imprimir, y anotar el resultado en `design.md`.
