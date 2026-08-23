## MODIFIED Requirements

### Requirement: El formulario se deriva del schema de datos del documento

El formulario de una factura DEBE (MUST) construirse recorriendo el `dataSchema` de la plantilla
elegida. Un camino que empieza por la raíz de ítem DEBE aparecer como columna de la lista de líneas;
cualquier otro, como campo de la factura. El tipo declarado DEBE decidir el control: texto, número,
fecha o casilla.

Un camino declarado obligatorio DEBE señalarse como tal en el formulario.

El camino de número de factura es la excepción: NO DEBE (MUST NOT) ofrecerse como campo editable,
porque el número lo asigna la emisión. La plantilla lo sigue declarando y lo sigue pintando; lo que
desaparece es la casilla donde alguien lo tecleaba.

Al revés que el número, el **motivo** de una nota de crédito DEBE aparecer como campo aunque ninguna
plantilla lo declare. Son las dos únicas excepciones y las dos por la misma razón: hay datos que
pertenecen al documento y no a su diseño. El número lo decide el sistema y por eso no se teclea; el
motivo lo decide quien corrige y por eso se teclea aunque el papel no lo pinte.

El formulario NO DEBE escribirse a mano por diseño: una plantilla que declara un camino
nuevo obtiene su campo sin tocar el formulario.

#### Scenario: Los campos salen del schema

- **WHEN** se abre el formulario de una factura sobre una plantilla que declara `cliente.nombre`
- **THEN** aparece un campo para `cliente.nombre`

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
