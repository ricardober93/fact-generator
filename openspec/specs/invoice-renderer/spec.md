# invoice-renderer Specification

## Purpose

La función pura e isomorfa que convierte un documento, sus datos y sus parámetros en marcado.
Corre igual en el servidor —para el embed— y en el navegador —para el lienzo del editor—, y es
la única implementación del montaje del documento: bandas, cardinalidad, tokens como custom
properties, geometría en milímetros y repetición de cabecera y pie al imprimir.

## Requirements

### Requirement: El render es una función pura e isomorfa

`render(doc, data, params, assets)` DEBE (MUST) ser una función pura: sin IO, sin acceso a
repositorios, sin red, sin `Date.now()` y sin leer `window` ni `process`. DEBE producir el
mismo marcado con las mismas entradas, tanto en Node como en el navegador.

Los archivos de `render/` NO DEBEN (MUST NOT) importar `@wabot-dev/framework`; solo
`@wabot-dev/framework/ui`, que es la única entrada del paquete con condición `browser`.

Quedan fuera de la regla los `*.unit.test.ts` y los de `__fixtures__/`: son código de test
que ningún island alcanza por sus imports, así que nunca entra en un bundle de navegador.
La regla existe para proteger ese bundle, no por pureza.

#### Scenario: Determinismo

- **WHEN** se renderiza dos veces el mismo documento con los mismos datos y parámetros
- **THEN** ambas salidas son idénticas carácter a carácter

#### Scenario: No muta sus entradas

- **WHEN** se renderiza un documento
- **THEN** el documento, los datos, los parámetros y los assets quedan sin modificar

#### Scenario: La frontera del bundle se respeta

- **WHEN** se inspeccionan los imports de los archivos bajo `render/` que no son tests ni
  fixtures
- **THEN** ninguno importa `@wabot-dev/framework` sin el sufijo `/ui`

### Requirement: Cardinalidad de las bandas en el marcado

El render DEBE (MUST) emitir `header` y `summary` una sola vez, `detail` una vez por
elemento de la colección de detalle, y colocar `detailHeader` en un `<thead>` y las
repeticiones de `detail` en el `<tbody>` de la misma tabla.

La tabla no es decorativa: es lo que hace que el navegador repita la cabecera en cada página
impresa sin código nuestro.

#### Scenario: La banda detail se repite por ítem

- **WHEN** se renderiza un documento con tres ítems de detalle
- **THEN** la banda `detail` aparece tres veces y `header` y `summary` una sola vez

#### Scenario: La cabecera de detalle va en thead

- **WHEN** se renderiza un documento con bloques en `detailHeader`
- **THEN** esos bloques quedan dentro de un `<thead>` y las repeticiones de `detail` dentro
  del `<tbody>` de la misma tabla

#### Scenario: Sin ítems

- **WHEN** se renderiza un documento con una colección de detalle vacía
- **THEN** el marcado se produce sin error, con `<tbody>` vacío, y `header`, `summary` y
  `pageFooter` presentes

### Requirement: El pie se repite en cada página impresa

El bloque `pageFooter` DEBE (MUST) emitirse fijo respecto a la página **solo bajo `@media print`**,
que es el mecanismo por el que el navegador lo reproduce en cada hoja al imprimir. En pantalla el
pie DEBE (MUST) quedar en el flujo del documento, al final del mismo.

Al imprimir, el contenedor del pie DEBE (MUST) ocupar el ancho útil del documento y quedar
alineado con la columna del resto de las bandas; NO DEBE (MUST NOT) extenderse hasta los bordes
del papel.

La regla se emite en la hoja de estilo del documento, junto a la de `@page`, y no como estilo
en línea del contenedor: un `position: fixed` en línea se posicionaría respecto al viewport y
sacaría el pie del papel en cualquier superficie que embeba el documento, como el lienzo del
editor.

#### Scenario: El pie se emite una vez y se posiciona fijo

- **WHEN** se renderiza un documento con bloques en `pageFooter`
- **THEN** aparece una sola vez en el marcado, y queda fijo respecto a la página al imprimir,
  nunca mediante un `position: fixed` en línea en su contenedor

#### Scenario: En pantalla el pie queda en el flujo del documento

- **WHEN** se inspecciona el contenedor del pie de un documento renderizado
- **THEN** no lleva `position: fixed` en línea, de modo que en pantalla queda al final del
  documento y no anclado al viewport

#### Scenario: Al imprimir el pie se fija a la página

- **WHEN** se inspecciona la hoja de estilo que emite el documento
- **THEN** contiene, dentro de `@media print`, la regla que fija el contenedor del pie al pie de
  la página

#### Scenario: El pie impreso se alinea con la columna del documento

- **WHEN** se inspecciona la regla de impresión del pie de un documento cuya página tiene
  márgenes laterales
- **THEN** el ancho declarado es el ancho útil del documento, y no el ancho total del papel

### Requirement: Geometría en milímetros

Toda medida emitida DEBE (MUST) expresarse en unidades `mm` de CSS, tomando el número del
documento sin factor de conversión. Las coordenadas de un bloque se emiten relativas a su
banda.

#### Scenario: Una medida del documento llega intacta al CSS

- **WHEN** un bloque declara `xMm: 12.5` y `widthMm: 60`
- **THEN** el marcado contiene `12.5mm` y `60mm`, sin píxeles ni puntos

#### Scenario: La página define el tamaño de impresión

- **WHEN** se renderiza un documento A4 vertical con márgenes de 15 mm
- **THEN** el CSS de impresión declara `@page` con ese tamaño y ese margen

### Requirement: Los tokens se emiten como CSS custom properties

El tema resuelto DEBE (MUST) emitirse como variables CSS en el contenedor raíz del
documento, y los bloques DEBEN referenciarlas con `var(--…)`. Un bloque NO DEBE llevar el
valor literal del token en su marcado.

Es lo que permite que un parámetro del embed repinte el documento entero sin volver a
recorrer un solo bloque.

#### Scenario: El tema viaja en la raíz

- **WHEN** se renderiza un documento cuyo tema declara `primary`
- **THEN** el contenedor raíz declara una custom property con ese valor

#### Scenario: Un parámetro repinta sin cambiar la estructura

- **WHEN** se renderiza el mismo documento dos veces, la segunda con un parámetro que
  cambia el token `primary`
- **THEN** solo cambia el valor de la custom property; el marcado de los bloques es idéntico

### Requirement: Cada tipo de bloque aporta su render

Cada definición del registro DEBE (MUST) aportar una función `render` que reciba el bloque
y su contexto y devuelva marcado. Renderizar un bloque cuyo `kind` no está en el registro
DEBE producir un error explícito, nunca marcado silenciosamente vacío.

La función `renderHeader` es opcional y solo se invoca para bloques de la banda `detail`; su
ausencia NO DEBE (MUST NOT) impedir que el tipo se registre ni se pinte.

Los seis tipos son `text`, `image`, `box`, `line`, `table` y `list`.

#### Scenario: Cada tipo produce marcado

- **WHEN** se renderiza un bloque de cada uno de los seis tipos
- **THEN** cada uno produce su marcado, y ninguno queda vacío

#### Scenario: Tipo desconocido

- **WHEN** se intenta renderizar un bloque cuyo `kind` no está en el registro
- **THEN** el render falla nombrando el `kind` desconocido

### Requirement: Las imágenes se pintan siempre como data URI

Un bloque `image` DEBE (MUST) resolver su asset contra los assets pasados al render y
emitirlo como `<img src="data:...">`. NO DEBE (MUST NOT) emitirse nunca el markup del SVG
inlineado en el DOM.

En el `src` de un `<img>` el navegador no ejecuta los scripts que pueda llevar un SVG;
inlineado como markup, sí los ejecuta.

#### Scenario: Un asset resuelto se pinta como img

- **WHEN** se renderiza un bloque `image` cuyo asset está entre los pasados al render
- **THEN** el marcado contiene un `<img>` cuyo `src` empieza por `data:`

#### Scenario: Un SVG con script nunca se inlinea

- **WHEN** se renderiza un bloque `image` cuyo asset es un SVG que contiene un `script`
- **THEN** el marcado contiene un `<img src="data:image/svg+xml;base64,...">` y en ningún
  caso una etiqueta `<svg>` en el DOM

#### Scenario: Asset ausente

- **WHEN** se renderiza un bloque `image` cuyo asset no está entre los pasados al render
- **THEN** se emite un hueco del tamaño declarado, sin `<img>` y sin romper el render

### Requirement: El texto se emite desde su estructura, nunca como HTML

El render DEBE (MUST) construir el texto a partir de sus fragmentos. El texto de un
fragmento DEBE tratarse como contenido literal: si contiene `<b>` o `<script>`, DEBE
aparecer como caracteres visibles y nunca interpretarse como marcado.

#### Scenario: HTML en un fragmento literal

- **WHEN** se renderiza un bloque de texto con el fragmento literal `<b>Total</b>`
- **THEN** el usuario ve los caracteres `<b>Total</b>` y el DOM no contiene un elemento `b`

#### Scenario: Marcas de fragmento

- **WHEN** un fragmento declara la marca `bold`
- **THEN** se emite con el peso correspondiente, sin concatenar HTML a mano

### Requirement: El marcado identifica su banda y sus bloques

Cada contenedor de banda DEBE (MUST) emitir el nombre de su banda y cada contenedor de bloque el
identificador de su bloque, como atributos de datos del marcado. Es lo que permite a una
superficie de edición medir la geometría ya maquetada en vez de recalcularla.

Estos atributos NO DEBEN (MUST NOT) alterar la presentación del documento.

#### Scenario: La banda se identifica en el marcado

- **WHEN** se renderiza un documento con bloques en `header` y en `summary`
- **THEN** cada contenedor de banda lleva un atributo de datos con el nombre de su banda

#### Scenario: El bloque se identifica en el marcado

- **WHEN** se renderiza una banda con varios bloques
- **THEN** el contenedor de cada bloque lleva un atributo de datos con el identificador de ese
  bloque, distinto para cada uno

### Requirement: Una lista de celdas se pinta resolviendo cada celda

El render DEBE (MUST) pintar cada celda de una propiedad de celdas resolviendo su ruta en el
contexto vigente y aplicando su formato y su alineación. Un bloque que dispone sus celdas en
horizontal DEBE respetar el ancho declarado de cada una, empezando en el origen del bloque; uno
que las apila en vertical reparte el alto del bloque entre sus filas. Una ruta que no resuelve
DEBE pintar la celda vacía sin detener el render, y la etiqueta de una celda NO DEBE (MUST NOT)
interpretarse como marcado.

#### Scenario: Cada celda pinta su valor formateado

- **WHEN** se renderiza un bloque de celdas en la banda `detail` con un ítem cuyas rutas resuelven
- **THEN** aparece una celda por cada declarada, con el valor de su ruta formateado según su
  formato

#### Scenario: Los anchos declarados se respetan

- **WHEN** se renderiza un bloque con celdas de 30 mm y 20 mm
- **THEN** la primera ocupa 30 mm desde el origen del bloque y la segunda empieza donde acaba la
  primera

#### Scenario: Las celdas apiladas emiten etiqueta y valor

- **WHEN** se renderiza un bloque que apila sus celdas
- **THEN** cada fila contiene la etiqueta de su celda y el valor de su ruta

#### Scenario: Una ruta ausente no rompe el render

- **WHEN** se renderiza un bloque de celdas cuya ruta no existe en los datos y no es obligatoria
- **THEN** la celda queda vacía y el resto del documento se pinta

#### Scenario: Marcado en una etiqueta se pinta como texto

- **WHEN** la etiqueta de una celda es `<b>Total</b>`
- **THEN** el usuario ve esos caracteres y el DOM no contiene un elemento `b`

### Requirement: La cabecera de un bloque de detalle se proyecta en detailHeader

Cuando un bloque de la banda `detail` pertenece a un tipo que aporta `renderHeader`, el render
DEBE (MUST) emitir esa cabecera dentro de la banda `detailHeader`, una sola vez, con la misma
coordenada horizontal y el mismo ancho que el bloque de origen. La proyección NO DEBE (MUST NOT)
alterar la cardinalidad de las bandas ni emitir un segundo contenedor con el mismo `data-block`:
se identifica con su propio atributo, que referencia el bloque de origen.

Es lo que permite que una tabla de ítems sea un único bloque sin perder la repetición de la
cabecera en cada página impresa, que sale del `<thead>`.

#### Scenario: La cabecera aparece una vez aunque haya muchos ítems

- **WHEN** se renderiza con tres ítems un documento con un bloque de `detail` que aporta cabecera
- **THEN** su cabecera aparece una sola vez, dentro del `<thead>`, y la banda `detail` tres veces

#### Scenario: La proyección comparte geometría horizontal con su bloque

- **WHEN** el bloque de origen está en `xMm` 20 con 60 mm de ancho
- **THEN** su cabecera proyectada ocupa esa misma coordenada y ese mismo ancho dentro de
  `detailHeader`

#### Scenario: La proyección no duplica el identificador de bloque

- **WHEN** se renderiza un documento con un bloque de `detail` que aporta cabecera
- **THEN** la banda `detailHeader` no contiene ningún contenedor con el `data-block` de ese
  bloque, y la proyección se identifica con un atributo propio que lo referencia

#### Scenario: Un bloque sin cabecera no proyecta nada

- **WHEN** se renderiza un documento cuyos bloques de `detail` no aportan `renderHeader`
- **THEN** la banda `detailHeader` contiene únicamente sus propios bloques

### Requirement: La impresión conserva los fondos de color

El CSS del documento DEBE (MUST) pedir al navegador que respete los colores de fondo al imprimir.
Sin esa instrucción el navegador descarta los fondos por omisión, y un diseño cuya identidad son
sus barras y sus bloques de color se imprime en blanco.

La instrucción DEBE aplicarse únicamente en el contexto de impresión y NO DEBE (MUST NOT) cambiar
nada de lo que se ve en pantalla.

#### Scenario: El documento pide colores exactos al imprimir

- **WHEN** se genera el CSS de una página
- **THEN** contiene, dentro de una regla de impresión, la petición de ajuste de color exacto

#### Scenario: En pantalla no cambia nada

- **WHEN** se genera el CSS de una página
- **THEN** la petición de color exacto está dentro de `@media print` y no fuera

### Requirement: Las filas de detalle pueden alternar de color a través del tema

Cuando el tema del documento declara un token de relleno alterno además del token de relleno de
fila, el CSS del documento DEBE (MUST) hacer que las filas pares de la tabla de detalle resuelvan el
token de relleno al valor del alterno. Un bloque cuyo relleno referencia el token de fila alterna
así de color sin que ningún bloque guarde un literal ni exista una propiedad de fila par.

Si el tema NO declara el token alterno, el CSS NO DEBE (MUST NOT) emitir la regla: un documento sin
filas alternas no puede quedar con las pares sin relleno.

El alternado es de fila de detalle, no de página: NO DEBE afectar a la cabecera, a los totales ni al
pie.

#### Scenario: El tema declara el alterno

- **WHEN** se genera el CSS de un documento cuyo tema declara relleno de fila y relleno alterno
- **THEN** el CSS hace que en las filas pares el token de relleno resuelva al alterno

#### Scenario: El tema no declara el alterno

- **WHEN** se genera el CSS de un documento cuyo tema no declara relleno alterno
- **THEN** el CSS no contiene la regla de alternado

#### Scenario: Las filas alternan al renderizar

- **WHEN** se renderiza un documento con cuatro ítems, tema con relleno alterno y un bloque de la
  banda de detalle cuyo relleno referencia el token de fila
- **THEN** las filas primera y tercera pintan con el relleno de fila y la segunda y la cuarta con el
  alterno

### Requirement: Una fecha sin hora se interpreta en la zona local

Al formatear un valor de fecha, un texto con forma `YYYY-MM-DD` DEBE (MUST) interpretarse como
medianoche en la zona horaria local. Interpretado como UTC, que es lo que hace el constructor de
fecha por defecto con ese formato, la fecha se pinta un día antes en cualquier zona al oeste de
Greenwich.

Un valor de fecha que ya lleva hora o desplazamiento NO DEBE (MUST NOT) cambiar de interpretación.

#### Scenario: Fecha sin hora en zona al oeste de Greenwich

- **WHEN** se formatea el valor `"2020-12-12"` con formato de fecha en una zona horaria negativa
- **THEN** el texto resultante es el del 12 de diciembre, no el del 11

#### Scenario: Fecha con hora

- **WHEN** se formatea un valor de fecha que incluye hora
- **THEN** se interpreta tal cual, sin ajuste

#### Scenario: Valor que no es fecha

- **WHEN** se formatea con formato de fecha un texto que no es una fecha
- **THEN** se devuelve el texto original
