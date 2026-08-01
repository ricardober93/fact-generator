## ADDED Requirements

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

El bloque `pageFooter` DEBE (MUST) emitirse con `position: fixed` respecto a la página, que
es el mecanismo por el que el navegador lo reproduce en cada hoja al imprimir.

#### Scenario: El pie se emite una vez y se posiciona fijo

- **WHEN** se renderiza un documento con bloques en `pageFooter`
- **THEN** aparece una sola vez en el marcado, dentro de un contenedor con `position: fixed`

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

Los cuatro tipos iniciales son `text`, `image`, `box` y `line`.

#### Scenario: Cada tipo inicial produce marcado

- **WHEN** se renderiza un bloque de cada uno de los cuatro tipos
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
