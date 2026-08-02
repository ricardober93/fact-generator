# invoice-document-model Specification

## Purpose

La forma del documento de factura: cinco bandas con bloques posicionados en milímetros
relativos a su banda, el registro de tipos de bloque que aporta schema, defaults y render, las
referencias a token en vez de literales, el contrato de datos y el de parámetros del embed, y la
validación pura que decide si un documento es válido.

## Requirements

### Requirement: Estructura del documento

Un documento de factura DEBE (MUST) ser un valor serializable a JSON sin pérdida, compuesto
por la página, el tema, el schema de parámetros del embed, el contrato de datos
(`dataSchema`), el locale, la moneda y las bandas. No DEBE contener funciones, fechas
nativas, referencias circulares ni HTML.

`dataSchema`, `locale` y `currency` se incorporan con `invoice-renderer`: el motor necesita
saber qué datos exige el documento y cómo formatear sus importes, y ambas cosas son
propiedades del documento, no del código que lo pinta.

#### Scenario: Ida y vuelta por JSON

- **WHEN** se serializa un documento válido con `JSON.stringify` y se vuelve a parsear
- **THEN** el resultado es estructuralmente idéntico al original

#### Scenario: Documento vacío por defecto

- **WHEN** se llama a `emptyDocument()` sin argumentos
- **THEN** devuelve un documento válido, de página A4 vertical, con las cinco bandas
  presentes y sin ningún bloque

#### Scenario: El documento vacío trae el contrato de datos y el formato

- **WHEN** se llama a `emptyDocument()` sin argumentos
- **THEN** el documento resultante declara un `dataSchema` vacío, un `locale` y una
  `currency` por defecto, y es válido

#### Scenario: Un documento sin contrato de datos es inválido

- **WHEN** se valida un documento al que le falta `dataSchema`
- **THEN** la validación falla nombrando el campo ausente

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
su identificador `kind`, su schema de propiedades, sus valores por defecto y su función de
render. El registro DEBE exponer la lista de tipos disponibles y la resolución de un `kind` a su
definición.

El componente `Inspector` de una definición es **opcional**. El schema de propiedades es el
contrato que dirige la edición: declarar el tipo de cada propiedad basta para que esa propiedad
sea editable. Una definición solo aporta `Inspector` cuando alguna de sus propiedades no se deja
editar por su tipo. Un tipo de bloque nuevo NO DEBE (MUST NOT) tener que escribir un panel de
propiedades para tenerlo.

Una definición PUEDE aportar además dos declaraciones opcionales: las bandas en las que se
admite, y una función `renderHeader` que produce la cabecera que le corresponde cuando el bloque
vive en la banda `detail`. Ninguna de las dos es obligatoria y su ausencia no cambia el
comportamiento de los tipos que ya existen.

El registro incorpora seis tipos: `text`, `image`, `box`, `line`, `table` y `list`.

#### Scenario: Registrar un tipo hace que exista

- **WHEN** se consulta el registro tras cargar los archivos de tipo
- **THEN** devuelve exactamente los tipos `text`, `image`, `box`, `line`, `table` y `list`

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

#### Scenario: Un tipo sin Inspector es una definición válida

- **WHEN** se define un tipo de bloque que no aporta `Inspector`
- **THEN** la definición es válida y el registro la acepta, y el tipo de cada propiedad de su
  schema es lo que determina cómo se edita

#### Scenario: Un tipo sin cabecera ni bandas declaradas sigue siendo válido

- **WHEN** se define un tipo que no declara `renderHeader` ni bandas admitidas
- **THEN** la definición es válida y el tipo se admite en las cinco bandas

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

### Requirement: El tipo de propiedad de celdas

Una propiedad declarada de tipo `cells` DEBE (MUST) guardarse como una lista ordenada de celdas.
Cada celda declara su etiqueta como cadena literal, su ruta de datos, su formato opcional, su
ancho en milímetros y su alineación. Una celda NO DEBE (MUST NOT) guardar marcado, ni un valor
literal de tema: como cualquier otra propiedad, el color y la tipografía salen de los tokens.

Es la estructura que permite que una tabla de N columnas sea un solo bloque, con un único sitio
donde cambiar el ancho de una columna.

#### Scenario: Una lista de celdas bien formada se acepta

- **WHEN** se valida un bloque cuya propiedad de celdas declara dos celdas con etiqueta, ruta,
  ancho positivo y alineación admitida
- **THEN** la validación pasa

#### Scenario: Un ancho de celda no válido se rechaza

- **WHEN** se valida un bloque con una celda cuyo ancho no es un número mayor que cero
- **THEN** la validación falla nombrando la celda culpable

#### Scenario: Una alineación desconocida se rechaza

- **WHEN** se valida un bloque con una celda cuya alineación no está entre las admitidas
- **THEN** la validación falla nombrando el valor no admitido

#### Scenario: Una etiqueta que no es texto se rechaza

- **WHEN** se valida un bloque con una celda cuya etiqueta no es una cadena
- **THEN** la validación falla nombrando la celda culpable

### Requirement: Una definición puede declarar las bandas que admite

Una definición de bloque PUEDE declarar la lista de bandas en las que se admite. Si la declara, un
documento con un bloque de ese tipo en otra banda NO DEBE (MUST NOT) validar. Si no la declara, el
tipo se admite en las cinco bandas.

Un bloque cuyo render depende de un ítem de detalle solo tiene sentido en la banda que se repite
por ítem; la declaración lo hace explícito en el modelo en vez de dejarlo al criterio de quien
edita.

#### Scenario: Sin declaración se admite en cualquier banda

- **WHEN** se valida un documento con bloques de un tipo que no declara bandas, repartidos en
  varias bandas
- **THEN** la validación pasa

#### Scenario: Un bloque en una banda no admitida falla

- **WHEN** se valida un documento con un bloque de un tipo que solo admite `detail` colocado en
  `pageFooter`
- **THEN** la validación falla nombrando el tipo y la banda

#### Scenario: El mismo bloque en su banda es válido

- **WHEN** ese mismo bloque está en `detail`
- **THEN** la validación pasa

### Requirement: Un bloque de caja puede rotarse

El tipo de bloque `box` DEBE (MUST) declarar en su schema una propiedad numérica de rotación
expresada en grados, con valor por defecto `0`. La rotación gira la caja alrededor de su centro y
NO DEBE (MUST NOT) alterar su geometría declarada: `xMm`, `yMm`, `widthMm` y `heightMm` siguen
describiendo la caja sin rotar, que es lo que el lienzo mide, mueve y encuadra.

Es la propiedad que hace posibles los chevrones y el mosaico de los diseños sin introducir un tipo
de bloque nuevo.

#### Scenario: Una caja nueva no está rotada

- **WHEN** se crea un bloque `box` indicando solo su `kind`
- **THEN** su rotación es `0`

#### Scenario: La rotación no cambia la geometría

- **WHEN** se rota una caja 45 grados
- **THEN** su `xMm`, `yMm`, `widthMm` y `heightMm` no cambian

#### Scenario: Un documento anterior sigue validando

- **WHEN** se valida un documento guardado antes de existir esta propiedad
- **THEN** la validación lo acepta y la caja se comporta como no rotada

### Requirement: Una tabla puede pintar su cabecera con color propio

El tipo de bloque `table` DEBE (MUST) declarar, además del color de sus filas, un color propio para
la cabecera que proyecta en la banda `detailHeader`. Ambas propiedades son referencias a token y el
color de cabecera toma por defecto el mismo token que el color del cuerpo, de modo que un documento
anterior no cambia de aspecto.

Es lo que permite que la cabecera vaya sobre una barra de color y su texto siga siendo legible.

#### Scenario: Por defecto la cabecera va del color del cuerpo

- **WHEN** se crea un bloque `table` indicando solo su `kind`
- **THEN** su color de cabecera es el mismo token que el color de sus filas

#### Scenario: Cabecera y filas se colorean por separado

- **WHEN** una tabla declara un color de cabecera distinto al de sus filas
- **THEN** el color de cabecera se aplica solo a la cabecera proyectada y las filas conservan el
  suyo

#### Scenario: El color de cabecera es una referencia a token

- **WHEN** se valida una tabla cuyo color de cabecera es un literal como `"#ffffff"`
- **THEN** la validación falla exigiendo una referencia a token

### Requirement: Un bloque puede marcarse como decorativo

Un bloque PUEDE llevar una marca booleana de decoración, ausente por defecto. La marca NO DEBE
(MUST NOT) tener ningún efecto sobre la validación ni sobre el render: es una ayuda de edición que
consumen el lienzo y la lista de capas.

Un documento sin ninguna marca de decoración DEBE (MUST) validar y renderizar exactamente igual que
antes de existir la marca.

#### Scenario: La marca es opcional

- **WHEN** se valida un documento cuyos bloques no llevan marca de decoración
- **THEN** la validación lo acepta

#### Scenario: La marca no altera la validación

- **WHEN** se valida un documento con bloques marcados como decorativos
- **THEN** la validación lo acepta igual que si no lo estuvieran

#### Scenario: La marca no altera el render

- **WHEN** se renderiza un documento y se vuelve a renderizar con los mismos bloques marcados como
  decorativos
- **THEN** el marcado resultante es el mismo
