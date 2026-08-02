## Why

El editor ya está vestido, pero **seguir montando una factura con él sigue siendo colocar cajitas
a mano**. El lienzo no ayuda a colocar y la pieza con la que se construye es demasiado pequeña.

**El lienzo no ayuda.** Para insertar hay que elegir antes la banda en un `<select>`, pulsar un
botón de la paleta y encontrarse el bloque en el origen de la banda, con sus medidas por defecto.
A partir de ahí: un bloque a la vez, un solo tirador de redimensión, sin guías, sin imán a los
vecinos, sin teclado, sin zoom, sin lista de lo que hay en la banda. Alinear una columna de
importes es mirar milímetros a ojo y arrastrar hasta que "parece".

**La pieza es demasiado pequeña.** La tabla de ítems —que es _el_ objeto de una factura— no
existe en el editor. Una tabla de cinco columnas son cinco bloques en `detailHeader` más cinco en
`detail`: **diez bloques que deben coincidir a mano en `x` y en `widthMm`**, y que vuelven a
descuadrarse en cuanto una columna cambia de ancho. Los totales, lo mismo: tres etiquetas y tres
importes enlazados que hay que mantener alineados entre sí. El trabajo crece con el número de
columnas y cada retoque lo reabre entero.

**Por qué ahora.** El registro de bloques es el único eje de crecimiento del proyecto y ya
funciona; el chrome acaba de recibir el sistema de diseño. Lo que queda sin diseñar es la capa de
interacción. Y el orden importa: meter bloques compuestos sin arreglar la manipulación deja
objetos grandes que siguen siendo incómodos de colocar, y arreglar la manipulación sin bloques
compuestos deja intacta la tarea más tediosa.

## What Changes

### Manipulación directa en el lienzo

- **Insertar es arrastrar desde la paleta al lienzo.** La banda es aquella sobre la que se suelta
  y el bloque nace donde se soltó, no en el origen. El `<select>` de banda deja de ser un paso
  obligatorio: pasa a ser un filtro de la lista de capas.
- **Guías de alineación con imán.** Durante el gesto, el bloque se pega a los bordes y centros de
  sus vecinos de banda, a los bordes de la banda y a los márgenes de página, con la guía dibujada
  mientras dura el enganche. Una tecla modificadora lo desactiva para el ajuste fino.
- **Multi-selección dentro de una banda**: clic con `Shift` y selección por marco. La selección
  se mueve, se duplica y se borra como un conjunto, y estrena **alinear y distribuir**.
- **Ocho tiradores de redimensión** en lugar de uno, con el mismo imán y los mismos límites de
  banda.
- **Teclado**: flechas mueven 1 mm y con `Shift` 10 mm, duplicar, copiar y pegar dentro del
  documento, `Escape` deselecciona. `Suprimir` y deshacer/rehacer siguen como están.
- **La geometría se ve y se escribe**: lectura en vivo de `x/y/ancho/alto` en milímetros durante
  el gesto y campos numéricos editables en el inspector para el ajuste exacto.
- **Zoom** de encaje al ancho, 100% y acercar/alejar. El zoom **no toca el documento**: es escala
  de pantalla, y la conversión píxel–milímetro sigue midiéndose del nodo maquetado.
- **Panel de capas** por banda: lo que hay dentro, en orden de pintado, para seleccionar lo que
  queda debajo de otro bloque y para reordenar la profundidad.
- **Un gesto sigue siendo una sola entrada de deshacer**, también cuando mueve varios bloques.

### Bloques compuestos

- **Tipo de propiedad nuevo, `cells`**: una lista ordenada de celdas `{ etiqueta, ruta, formato,
ancho, alineación }`. Es estructura, como el texto: **nunca HTML**, y enlazar una ruta nueva la
  sigue declarando en el `dataSchema` como opcional.
- **Bloque `table`**, para la banda `detail`: pinta una fila de celdas por ítem y **proyecta su
  fila de cabecera en `detailHeader`**, con la misma `x` y el mismo ancho, para que el navegador
  la repita en cada página impresa por el `<thead>` que ya existe. Un objeto, N columnas, un solo
  sitio donde cambiar un ancho.
- **Bloque `list`**: filas de etiqueta y valor apiladas. Sirve para los datos del cliente en la
  cabecera y para los totales en `summary`, que hoy son bloques sueltos alineados a mano.
- **`defineBlock` gana `renderHeader` opcional.** Es lo que hace posible la proyección sin
  romper la regla de que un bloque pertenece a una banda: el bloque vive en `detail` y el motor
  emite su cabecera en `detailHeader`.
- **Una definición puede declarar en qué bandas se admite.** La paleta solo ofrece los tipos
  válidos para la banda de destino, de modo que una tabla de ítems no acaba en el pie de página.
- **El inspector gana el editor de `cells`**: añadir, borrar, reordenar y enlazar celdas,
  reutilizando el editor de enlaces que ya tiene el texto.

## Capabilities

### New Capabilities

Ninguna. El cambio profundiza superficies ya especificadas: el editor y el motor de render.

### Modified Capabilities

- `template-editor`: gana requisitos de manipulación directa —inserción por arrastre con la banda
  deducida del punto de soltado, imán y guías de alineación, multi-selección con alineación y
  distribución, redimensión por ocho tiradores, teclado, zoom de pantalla que no toca el
  documento, lista de capas por banda y edición numérica de la geometría—, más el panel de
  propiedades de `cells`.
- `invoice-document-model`: el tipo de propiedad `cells` como estructura validada, y la
  posibilidad de que una definición de bloque declare las bandas que lo admiten.
- `invoice-renderer`: cómo se pinta una lista de celdas y cómo se proyecta la cabecera de un
  bloque de `detail` dentro de `detailHeader` sin alterar la cardinalidad de las bandas.

## Impact

- **Código nuevo**: `ui/snapping.ts` y `ui/arrange.ts` (funciones puras: candidatos de imán,
  alineación y distribución), `ui/LayersPanel.tsx`, `ui/CellsEditor.tsx`, `ui/ZoomControls.tsx`,
  `render/blocks/table.tsx` y `render/blocks/list.tsx`.
- **Código modificado**: `Canvas.tsx` —que se parte para no pasar de 250 líneas—, `geometry.ts`,
  `documentEdits.ts`, `editorStore.ts` (la selección pasa de un id a una lista dentro de una
  banda), `Palette.tsx`, `Inspector.tsx`, `propertyEditors.tsx`, `editorCss.ts`, y en el motor
  `document.ts`, `defineBlock.ts`, `registry.ts`, `bands.tsx` y `validateDocument.ts`.
- **Sin dependencias npm nuevas** y sin librería de arrastre: el gesto ya se resuelve con eventos
  de puntero.
- **Sin migración de datos**. `cells` solo aparece en bloques nuevos; los documentos guardados se
  siguen leyendo igual. El peso añadido son unos cientos de bytes por tabla, muy lejos del límite
  de 100 kb del `@action`.
- **El golden del render se regenera** para incluir una tabla y una lista.
- Los ganchos `data-band` y `data-block` **no se tocan**, así que las pruebas que ya afirman sobre
  ellos siguen valiendo.

## Fuera de alcance

Este cambio **no** reabre ninguna decisión cerrada:

- **El modelo del documento se queda como está**: cinco bandas, milímetros, coordenadas relativas
  a la banda, referencias a token en vez de literales. Un bloque compuesto es un bloque más, no
  un modelo paralelo.
- **No hay selección entre bandas ni agrupación de bloques.** Las coordenadas son relativas a la
  banda, así que una selección a caballo entre dos no tiene significado; y agrupar es justo lo que
  vienen a resolver los bloques compuestos.
- **"Como Figma" es la manipulación directa, no el producto Figma.** No entran rotación,
  auto-layout, componentes con variantes, estilos compartidos, comentarios, multijugador ni
  historial en la nube.
- **No entra dominio fiscal**: ni QR, ni CUFE, ni XML, ni catálogos SRI/DIAN/CFDI. Una tabla de
  ítems es maquetación, no una declaración.
- **El PDF sigue saliendo solo de la impresión del navegador**, y la paginación en pantalla sigue
  abierta y fuera: el corte real se ve en Ctrl+P.
- **El embed no cambia de contrato**: mismo origen, cookies de sesión, sin sistema de diseño, sin
  `static`, y los datos nunca en el query string.
- **El guardado sigue siendo explícito** y con bloqueo optimista por `rev`. No entra autoguardado.
- **No entra la subida de assets**, que sigue siendo el cambio `asset-upload`, ni se decide la
  autenticación de `/templates`.
- **No entra edición de texto enriquecido** más allá de los fragmentos y marcas que ya existen.
