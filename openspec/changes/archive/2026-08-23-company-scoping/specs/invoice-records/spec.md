## MODIFIED Requirements

### Requirement: Una factura guarda datos, nunca un papel

Una factura DEBE (MUST) guardar el identificador de la plantilla con la que se pinta por defecto,
los datos de la factura, la lista de sus líneas y los parámetros del embed. NO DEBE (MUST NOT)
guardar el HTML renderizado, ningún PDF, ninguna imagen del documento ni una copia del diseño.

Junto a esos datos, una factura DEBE guardar como **campos propios** —no como rutas dentro del
registro libre— su tipo de documento, su estado, su empresa, y, una vez emitida, su prefijo, su
número, su instante de emisión, el emisor con el que salió y quién la emitió. Son los cinco datos que decide el sistema y no la plantilla: por eso no pueden
vivir en un blob que cualquiera edita, y por eso se pueden consultar sin traerse todas las facturas
a memoria.

Junto a ellos, una factura DEBE guardar un **contador de revisión**: un entero que sube en
cada guardado y que solo existe para detectar escrituras que se pisan. NO DEBE (MUST NOT)
guardar las revisiones anteriores: es un contador, no un historial.

El papel se vuelve a pintar en cada visita a partir de los datos guardados y de la plantilla **en el
estado en que esté en ese momento**. Es lo que permite retocar un diseño y que las facturas ya
emitidas salgan con el retoque. Lo que queda congelado al emitir son los **datos**, no el diseño:
el papel es la representación, el registro son los datos.

Guardar una factura DEBE validar que los datos obligatorios que declara su plantilla están
presentes, con el mismo criterio que usa el render.

#### Scenario: Lo que se guarda

- **WHEN** se guarda una factura
- **THEN** quedan almacenados la plantilla, los datos, las líneas, los parámetros, el tipo, el
  estado y el contador de revisión, y nada más

#### Scenario: Lo que se guarda al emitir

- **WHEN** se emite una factura
- **THEN** quedan almacenados además su prefijo, su número, su instante de emisión, el emisor
  congelado y quién la emitió, como campos propios

#### Scenario: No se guarda el historial

- **WHEN** se guarda una factura varias veces seguidas
- **THEN** solo queda almacenado el último estado, y del contador solo su valor actual

#### Scenario: Retocar el diseño alcanza a las facturas viejas

- **WHEN** se guarda una factura, se cambia después un color de la plantilla y se vuelve a abrir
- **THEN** la factura se pinta con el color nuevo, sin haber tocado sus datos

#### Scenario: Retocar el diseño también alcanza a las emitidas

- **WHEN** se emite una factura, se cambia después un color de su plantilla y se vuelve a abrir
- **THEN** se pinta con el color nuevo y sus datos congelados no cambian

#### Scenario: Una factura sin sus datos obligatorios no se guarda

- **WHEN** se intenta guardar una factura a la que le falta un dato que su plantilla declara
  obligatorio
- **THEN** el guardado falla nombrando los caminos que faltan y no queda nada almacenado

### Requirement: El formulario se deriva del schema de datos del documento

El formulario de una factura DEBE (MUST) construirse recorriendo el `dataSchema` de la plantilla
elegida. Un camino que empieza por la raíz de ítem DEBE aparecer como columna de la lista de líneas;
cualquier otro, como campo de la factura. El tipo declarado DEBE decidir el control: texto, número,
fecha o casilla.

Un camino declarado obligatorio DEBE señalarse como tal en el formulario.

El camino de número de factura es la excepción: NO DEBE (MUST NOT) ofrecerse como campo editable,
porque el número lo asigna la emisión. La plantilla lo sigue declarando y lo sigue pintando; lo que
desaparece es la casilla donde alguien lo tecleaba.

Los caminos de **emisor** son la misma excepción que el número, y por el mismo motivo: los decide el
sistema a partir de la empresa, así que la plantilla los sigue declarando y pintando y lo que
desaparece es la casilla.

Al revés que los dos anteriores, el **motivo** de una nota de crédito DEBE aparecer como campo aunque
ninguna plantilla lo declare. Son las tres únicas excepciones, y se explican con una sola regla: un
dato que decide el sistema no se teclea aunque esté en el schema, y un dato que decide la persona se
teclea aunque no esté.

El formulario NO DEBE escribirse a mano por diseño: una plantilla que declara un camino
nuevo obtiene su campo sin tocar el formulario.

#### Scenario: Los campos salen del schema

- **WHEN** se abre el formulario de una factura sobre una plantilla que declara `cliente.nombre`
- **THEN** aparece un campo para `cliente.nombre`

#### Scenario: El emisor no es un campo del formulario

- **WHEN** se abre el formulario sobre una plantilla que declara `emisor.nombre`
- **THEN** no aparece ninguna casilla para escribirlo, y el documento lo pinta igualmente

#### Scenario: El número no es un campo del formulario

- **WHEN** se abre el formulario de una factura sobre una plantilla que declara el camino de número
- **THEN** no aparece ninguna casilla para escribirlo

#### Scenario: El motivo es un campo aunque no esté en el schema

- **WHEN** se abre el formulario de una nota de crédito sobre una plantilla que no declara ningún
  camino de motivo
- **THEN** aparece igualmente el campo de motivo

#### Scenario: Los caminos de ítem son columnas, no campos

- **WHEN** la plantilla declara `item.descripcion` y `cliente.nombre`
- **THEN** `item.descripcion` aparece como columna de la lista de líneas y `cliente.nombre` como
  campo de la factura

#### Scenario: El tipo declarado elige el control

- **WHEN** la plantilla declara un camino de tipo `date` y otro de tipo `number`
- **THEN** el primero se edita con un control de fecha y el segundo con uno numérico

#### Scenario: Una plantilla con un camino nuevo trae su campo sola

- **WHEN** se añade un camino al `dataSchema` de una plantilla y se abre el formulario
- **THEN** aparece un campo para ese camino sin haber cambiado el formulario
