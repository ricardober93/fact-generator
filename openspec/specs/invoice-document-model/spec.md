# invoice-document-model Specification

## Purpose
TBD - created by archiving change invoice-template-model. Update Purpose after archive.
## Requirements
### Requirement: Estructura del documento

Un documento de factura DEBE (MUST) ser un valor serializable a JSON sin pérdida, compuesto por
la página, el tema, el schema de parámetros del embed y las bandas. No DEBE contener
funciones, fechas nativas, referencias circulares ni HTML.

#### Scenario: Ida y vuelta por JSON

- **WHEN** se serializa un documento válido con `JSON.stringify` y se vuelve a parsear
- **THEN** el resultado es estructuralmente idéntico al original

#### Scenario: Documento vacío por defecto

- **WHEN** se llama a `emptyDocument()` sin argumentos
- **THEN** devuelve un documento válido, de página A4 vertical, con las cinco bandas
  presentes y sin ningún bloque

### Requirement: Milímetros como unidad universal

Toda medida del documento —tamaño de página, márgenes, posición y dimensiones de un
bloque, alto de una banda— DEBE expresarse en milímetros, como número. El modelo NO DEBE (MUST NOT)
contener píxeles, puntos, porcentajes ni cadenas con sufijo de unidad.

#### Scenario: Una medida es un número

- **WHEN** se inspecciona cualquier campo de medida de un documento válido
- **THEN** su tipo es `number` y nunca una cadena como `"210mm"` o `"100%"`

#### Scenario: Medida negativa rechazada

- **WHEN** se valida un documento cuya página tiene ancho o alto menor o igual a cero
- **THEN** la validación falla indicando el campo culpable

### Requirement: Las cinco bandas y su cardinalidad

El documento DEBE (MUST) tener exactamente cinco bandas, identificadas por nombre fijo:
`header`, `detailHeader`, `detail`, `summary` y `pageFooter`. Cada banda DEBE declarar su
alto en milímetros y su lista de bloques. La banda `detail` es la única que se repite una
vez por ítem de datos; las demás aparecen una sola vez por documento.

#### Scenario: Faltan bandas

- **WHEN** se valida un documento al que le falta alguna de las cinco bandas
- **THEN** la validación falla nombrando la banda ausente

#### Scenario: Banda desconocida

- **WHEN** se valida un documento que declara una banda con un nombre fuera de los cinco
- **THEN** la validación falla nombrando la banda sobrante

#### Scenario: Bandas vacías permitidas

- **WHEN** se valida un documento cuyas bandas existen pero no tienen bloques
- **THEN** la validación pasa

### Requirement: Coordenadas relativas a la banda

La posición `x`/`y` de un bloque DEBE (MUST) interpretarse como relativa al origen de su banda,
nunca al de la página. Un bloque DEBE caber dentro del ancho útil de la página y dentro
del alto declarado de su banda.

#### Scenario: Bloque que se sale del alto de su banda

- **WHEN** se valida un documento con un bloque cuyo `y + alto` supera el alto de su banda
- **THEN** la validación falla identificando el bloque y su banda

#### Scenario: Bloque que se sale del ancho útil

- **WHEN** se valida un documento con un bloque cuyo `x + ancho` supera el ancho de página
  menos los márgenes izquierdo y derecho
- **THEN** la validación falla identificando el bloque

#### Scenario: La misma coordenada vale en cualquier banda

- **WHEN** dos bloques idénticos se colocan en `header` y en `detail` con la misma `y`
- **THEN** ambos son válidos, porque cada uno se mide contra el alto de su propia banda

### Requirement: Registro de tipos de bloque

Un tipo de bloque DEBE (MUST) definirse en un único archivo mediante `defineBlock()`, aportando
su identificador `kind`, su schema de propiedades, sus valores por defecto, su función de
render y su componente Inspector. El registro DEBE exponer la lista de tipos disponibles y
la resolución de un `kind` a su definición.

El cambio incorpora cuatro tipos: `text`, `image`, `box` y `line`.

#### Scenario: Registrar un tipo hace que exista

- **WHEN** se consulta el registro tras cargar los cuatro archivos de tipo
- **THEN** devuelve exactamente los tipos `text`, `image`, `box` y `line`

#### Scenario: Bloque de tipo desconocido

- **WHEN** se valida un documento con un bloque cuyo `kind` no está en el registro
- **THEN** la validación falla nombrando el `kind` desconocido

#### Scenario: Los defaults completan un bloque nuevo

- **WHEN** se crea un bloque indicando solo su `kind`
- **THEN** el bloque resultante tiene todas las propiedades de ese tipo rellenadas con los
  valores por defecto declarados por su definición

#### Scenario: Propiedad fuera del schema del tipo

- **WHEN** se valida un bloque `line` que declara una propiedad que su schema no contempla
- **THEN** la validación falla nombrando la propiedad sobrante

### Requirement: Los bloques referencian tokens, no literales

Un bloque NO DEBE (MUST NOT) guardar un valor literal de tema —color, familia tipográfica o imagen—.
DEBE guardar una referencia al token correspondiente, escrita con `@` inicial. Los valores
literales viven únicamente en el tema del documento.

#### Scenario: Color literal rechazado

- **WHEN** se valida un bloque cuyo color es `"#ff0000"`
- **THEN** la validación falla exigiendo una referencia a token

#### Scenario: Referencia a token inexistente

- **WHEN** se valida un documento con un bloque que referencia `@acento` y el tema no
  declara ese token
- **THEN** la validación falla nombrando el token no declarado

#### Scenario: Cambiar el tema repinta sin tocar bloques

- **WHEN** se sustituye el valor de un token en el tema de un documento válido
- **THEN** ningún bloque cambia y el documento sigue siendo válido

### Requirement: El documento declara el contrato de su embed

El documento DEBE (MUST) declarar el schema de los parámetros que acepta su embed: nombre, tipo,
valor por defecto y, cuando aplique, valores admitidos. Es el documento —no el código del
controlador— quien define qué parámetros existen.

#### Scenario: Aplicar un parámetro declarado

- **WHEN** se resuelve el tema de un documento pasando un parámetro presente en su schema
- **THEN** el token correspondiente toma el valor del parámetro

#### Scenario: Parámetro no declarado

- **WHEN** se resuelve el tema pasando un parámetro que el schema no declara
- **THEN** el parámetro se ignora y el tema queda con sus valores por defecto

#### Scenario: Parámetro declarado con valor inadmisible

- **WHEN** se resuelve el tema pasando un parámetro declarado como enumerado, con un valor
  fuera de la lista admitida
- **THEN** el parámetro se ignora y se conserva su valor por defecto

### Requirement: El texto se guarda como estructura

El contenido de un bloque de texto DEBE (MUST) guardarse como estructura de datos —fragmentos con
sus marcas y sus enlaces a datos—, nunca como cadena de HTML.

#### Scenario: HTML en el contenido

- **WHEN** se valida un bloque de texto cuyo contenido es la cadena `<b>Total</b>`
- **THEN** la cadena se trata como texto literal y no como marcado

#### Scenario: Enlace a dato

- **WHEN** un fragmento de texto declara un enlace a `cliente.nombre`
- **THEN** queda representado como fragmento de tipo enlace con esa ruta, y no como la
  cadena `{{cliente.nombre}}`

### Requirement: La validación es una función pura

`validateDocument(doc)` DEBE (MUST) ser una función pura: sin IO, sin acceso a base de datos, sin
red y sin depender de la hora. DEBE devolver todos los problemas encontrados, no solo el
primero, y cada problema DEBE indicar la ruta del campo culpable.

#### Scenario: Se reportan todos los errores

- **WHEN** se valida un documento con tres errores independientes
- **THEN** el resultado contiene los tres, cada uno con la ruta de su campo

#### Scenario: Determinismo

- **WHEN** se valida el mismo documento dos veces
- **THEN** ambos resultados son idénticos

#### Scenario: La validación no muta

- **WHEN** se valida un documento
- **THEN** el documento de entrada queda sin modificar

