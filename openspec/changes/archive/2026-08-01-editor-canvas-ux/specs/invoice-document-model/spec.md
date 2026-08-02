## ADDED Requirements

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

## MODIFIED Requirements

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
