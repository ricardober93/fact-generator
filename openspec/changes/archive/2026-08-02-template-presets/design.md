## Context

Los cinco diseños ya existen en `src/invoice/templates/` y funcionan: cada uno construye un
`IDocument` que valida, se guarda como cualquier otro y se edita con el editor que ya hay. Lo que
falta no es motor, es superficie.

El punto de partida real, verificado en el código:

- `TemplateController.create` ya acepta `preset` y ya resuelve el catálogo. La galería sustituye a
  un `<select>`, no inventa un flujo.
- `Canvas.tsx` pinta el documento llamando a `render()` dentro de un `div.wb-paper` con ancho en
  milímetros y una `transform: scale()` por encima. La galería puede repetir ese truco con otro
  factor de escala.
- **Corrección sobre la marcha**: `render()` emite siempre `<style>{pageCss(...)}</style>` dentro
  del árbol que devuelve, así que el lienzo **sí** inyecta hoy la regla `@page` en la página del
  editor. Cinco tarjetas harían lo mismo cinco veces en la lista de plantillas. Ver la decisión
  sobre cómo se separa.
- `documentEdits.setBandHeight` está escrito y probado, y **nadie lo llama**.
- `setThemeToken` existe y solo lo usa el `TokenEditor` que vive dentro de una fila de propiedades
  del inspector.
- `validateDocument` valida las **propiedades** de un bloque contra el schema de su tipo, de forma
  estricta en ambos sentidos, pero **no enumera los campos del bloque**. Un campo opcional nuevo en
  `IBlock` pasa la validación sin tocarla.
- `pageCss` tiene **un solo llamador**, `render.tsx:60`.

El resto del contexto arquitectónico está en ARCHITECTURE.md y no se repite aquí.

## Goals / Non-Goals

**Goals:**

- Que elegir un diseño sea mirarlo.
- Que las dos cosas que definen a un preset —su tema y sus altos de banda— se puedan tocar sin
  buscar el bloque adecuado.
- Que 66 cajas de decoración no hagan inservible la banda que las contiene.
- Que el motor tenga en spec lo que ya hace.

**Non-Goals:**

- Miniaturas rasterizadas, generación de imágenes o cualquier paso de build para las
  previsualizaciones.
- Presets en base de datos, editables o importables.
- Agrupación real de bloques con geometría propia.
- Rediseñar los cinco diseños actuales.

## Decisions

### La previsualización es el render de verdad, escalado con CSS

Cada tarjeta de la galería llama a `render({ doc, data, items })` con los datos de muestra que
`sampleDataFor` deriva del propio documento, y lo mete en un contenedor con `overflow: hidden` y una
`transform: scale(k)`. Es literalmente lo que hace el lienzo, con otro factor.

La tarjeta **no** inyecta `pageCss`. Es deliberado: `pageCss` emite `@page` y reglas de `@media
print`, y `@page` no está scopeado a un subárbol —afectaría a la impresión de la página de
plantillas entera—. El documento no lo necesita para verse, porque sus estilos son en línea.

Como `render()` sí lo emite, el CSS del documento se parte en dos por concepto:

- `pageCss(page)`: `@page`, colores exactos al imprimir y el pie fijo. Es lo global a la hoja.
- `documentCss(theme)`: el alternado de filas, que afecta también a pantalla y es inofensivo
  repetido.

`render()` acepta `pageRules: false` y entonces omite solo el primero. La galería lo pasa; el embed
y el lienzo no. Es un booleano y un `<style>` partido en dos, frente a la alternativa de duplicar el
render o envolver cada tarjeta en un iframe.

- _Frente a capturas de pantalla_: se quedan viejas al primer retoque de un diseño y obligan a un
  paso de generación. La spec exige explícitamente que no sean imágenes almacenadas.
- _Frente a un `<iframe srcdoc>` por tarjeta_: aislaría igual de bien, pero son cinco iframes en una
  página de lista para conseguir los mismos píxeles que un `div` con `overflow: hidden`.
- _Frente a renderizar en el cliente_: la previsualización no cambia mientras se mira. Es SSR.

Los diseños referencian su logo por token `@logo` y en la galería no hay assets, así que la imagen
sale vacía. Es correcto y es lo que se verá también al crear la plantilla hasta que se suba un logo.

### La galería es marcado del `@view`, no un island

Cinco tarjetas con un `<input type="radio" name="preset">` cada una, dentro del formulario de alta
que ya existe, más una tarjeta «en blanco» con `value=""`. Sin JavaScript: el navegador ya sabe
seleccionar un radio y enviarlo. El `@action` no cambia de firma.

### El catálogo sigue siendo un array literal

`ITemplatePreset` gana `description` y `family`. Nada más. No hay `definePreset()`, ni carpeta por
preset, ni registro por decorador.

El registro de tipos de bloque existe porque es **el único punto de extensión** del sistema y lo
consumen la paleta, la validación, el render y el inspector. Un catálogo de cinco entradas que solo
consume una galería no gana nada con esa maquinaria; ganaría un archivo por diseño y una indirección.

### La decoración es un campo opcional de `IBlock`, no una propiedad de schema

`decorative?: boolean` en `IBlock`, junto a `id` y a la geometría, porque es metadato de edición
como ellos —no algo que el render consulte—.

Como propiedad de schema habría que declararla en los seis tipos de bloque, defaultearla en los
seis, y aparecería como un checkbox en el panel de propiedades de todos. Como campo opcional del
bloque no toca ningún tipo, y `validateDocument` la acepta sin cambios porque no enumera campos de
bloque (verificado arriba).

Consumidores: `LayersPanel` la agrupa, y el picking del lienzo la salta. El render **no la mira**:
la spec exige que el marcado sea idéntico con y sin marca, y la forma más barata de garantizarlo es
que el render ni se entere.

_Alternativa descartada_: deducir la decoración de una convención en el `id` (`mosaic0`…). Frágil y
sorprendente.

### El panel de tema decide su control mirando el valor, no el token

`doc.theme` es `Record<string, string>` sin tipos de token. Para elegir entre selector de color y
campo de texto se mira el valor: si parece un color CSS, se ofrecen **las dos cosas** —una muestra
`<input type="color">` y el campo de texto—, y **el campo de texto es la fuente de verdad**.

Es lo que evita el problema clásico: `<input type="color">` no sabe expresar `transparent`, un color
con nombre ni `rgba()`, y si fuera el único control degradaría valores que hoy son válidos. La
muestra escribe en el campo; el campo escribe en el documento.

_Alternativa descartada_: tipar los tokens en el modelo (`{ kind: 'color', value }`). Cambia el
documento, obliga a migrar lo guardado y a tocar `validateTheme`, todo para elegir un widget.

`ponytail:` la heurística es «empieza por `#` o es una función de color CSS». Si algún día un token
de color se escribe de una forma que no reconoce, se ve el campo de texto, que sigue funcionando.

### El alto de banda entra donde ya se edita geometría

Cuando hay banda seleccionada y no hay bloque, el inspector —que hoy solo dice «selecciona un
bloque»— muestra el alto de la banda. Ese hueco ya existe y es donde el usuario está mirando.
Conecta con `setBandHeight`, que ya reencuadra los bloques que quedan fuera.

### Aplicar un diseño ocurre en el cliente, contra el store

El island importa el catálogo y llama a `store.commit(preset.build())`. El historial es el del
store, así que deshacer sale gratis y no hay que guardar para probar un diseño.

Se puede hacer porque `templates/` solo importa de `render/`, que es el árbol isomorfo: no arrastra
la raíz del framework y no rompe el bundle del island.

_Coste_: los cinco diseños entran en el bundle del editor (~1.200 líneas de constructores de
bloques, sin dependencias). _Alternativa_: un `@action` que devuelva el documento construido en el
servidor; ahorra bundle a cambio de un viaje de red y un endpoint más. Se elige el cliente porque
aplicar un diseño es una operación de edición, y las operaciones de edición del editor son locales
hasta que se guarda.

La confirmación es un `confirm()` del navegador. Sustituye el documento entero; no merece un diálogo
propio.

### El alternado de filas se condiciona al tema

Hoy `pageCss` emite siempre `tbody tr:nth-child(even) td { --rowFill: var(--rowAltFill); }`. En un
documento cuyo tema declara `rowFill` pero **no** `rowAltFill`, esa regla deja las filas pares con
la variable sin resolver. Ningún preset actual está en ese caso, pero cualquier documento hecho a
mano puede estarlo.

La regla se muda a `documentCss(theme)`, que devuelve cadena vacía si el tema no declara el token
alterno; `render()` no emite entonces ningún `<style>` para ella. Un cambio con un único llamador.

### Lo que apareció al implementar: añadir una propiedad rompía lo ya guardado

`validateDocument` exige que **todas** las propiedades del schema de un tipo estén presentes en el
bloque, y nada rellenaba las que faltasen al leer un documento. Añadir `rotationDeg` a `box` fue,
sin que se notara, un cambio que invalidaba cualquier documento guardado antes —y lo mismo valdría
para toda propiedad futura—. Con el almacenamiento en memoria de hoy no se ve; con `DATABASE_URL`
puesto, sí.

`withBlockDefaults(doc)` pasa cada bloque por `applyDefaults`, y se aplica en el getter
`Template.doc`, que es por donde entran los documentos guardados a las dos superficies. Un `kind`
desconocido se deja intacto para que lo reporte la validación, en vez de reventar en la lectura.

## Risks / Trade-offs

- **Cinco documentos renderizados en la página de lista** → Son funciones puras sin E/S; el mosaico,
  el más pesado, son 66 cajas. Si alguna vez pesa, la galería se mueve a su propia vista.
- **`transform: scale()` no reflowea el texto** → Una previsualización muy pequeña puede volverse
  ilegible aunque sea fiel. Es aceptable: la tarjeta transmite la composición y el color, que es lo
  que se está eligiendo; el nombre y la descripción dicen el resto.
- **Los diseños viajan en el bundle del editor** → Sin dependencias y son datos; si el bundle
  molesta, la construcción se mueve a un `@action`. La decisión es reversible en un archivo.
- **`decorative` es un campo que el render ignora** → Un futuro tipo de bloque podría querer
  mirarlo y no debería. La spec lo dice de forma normativa y hay un escenario que compara el
  marcado con y sin marca.
- **El campo de texto como fuente de verdad del color** → Se puede escribir un valor que no es un
  color y el documento seguirá validando, porque `validateTheme` no valida sintaxis de color. Es el
  comportamiento de hoy y este cambio no lo empeora.
- **Aplicar un diseño destruye el trabajo hecho** → Confirmación previa y deshacer disponible; y
  como no guarda, cerrar sin guardar también lo revierte.
