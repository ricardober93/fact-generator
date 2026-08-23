## ADDED Requirements

### Requirement: Una nota de crédito es el mismo documento con otro tipo

Una nota de crédito DEBE (MUST) guardarse como el mismo tipo de entidad que una factura,
distinguida únicamente por su tipo de documento. DEBE usar el mismo formulario derivado del
`dataSchema` de su plantilla, el mismo motor de render y las mismas reglas de emisión y
congelación.

Una entidad propia tendría los mismos campos, el mismo formulario, el mismo render y el mismo
listado: sería un duplicado completo para distinguir dos valores de un campo.

#### Scenario: Se crea y se emite como cualquier documento

- **WHEN** se crea una nota de crédito, se rellena y se emite
- **THEN** pasa por las mismas reglas de aritmética, congelación y numeración que una factura

#### Scenario: El listado las distingue

- **WHEN** se abre el listado con facturas y notas de crédito guardadas
- **THEN** cada fila dice de qué tipo es

### Requirement: Una nota de crédito se numera con su propio rango

Una nota de crédito DEBE (MUST) tomar su consecutivo de un rango declarado para notas de crédito.
NO DEBE (MUST NOT) consumir consecutivos de un rango de facturas, aunque compartan prefijo.

#### Scenario: No toca el consecutivo de las facturas

- **WHEN** se emite una nota de crédito existiendo rangos de los dos tipos
- **THEN** avanza el puntero del rango de notas de crédito y el de facturas no cambia

#### Scenario: Sin rango propio no se emite

- **WHEN** se emite una nota de crédito y solo hay rangos de facturas
- **THEN** la emisión se rechaza diciendo que falta un rango de notas de crédito

### Requirement: Una nota de crédito referencia una factura emitida y no la modifica

Una nota de crédito DEBE (MUST) guardar la referencia al documento que corrige, junto con el
número y el prefijo con los que ese documento se emitió. La factura referenciada DEBE estar
emitida, y NO DEBE (MUST NOT) cambiar en nada al emitirse la nota: ni sus datos, ni su estado, ni
su número.

Guardar el número además del identificador es lo que hace que la referencia se pueda pintar en el
papel sin ir a buscar el otro documento, y lo que la deja legible aunque la factura corregida se
consulte años después.

#### Scenario: La factura corregida no se entera

- **WHEN** se emite una nota de crédito que referencia una factura emitida
- **THEN** la factura conserva exactamente sus datos, su estado y su número

#### Scenario: No se corrige un borrador

- **WHEN** se intenta referenciar una factura que todavía es borrador
- **THEN** la emisión de la nota de crédito se rechaza

#### Scenario: La referencia queda legible

- **WHEN** se abre una nota de crédito emitida
- **THEN** muestra el número y el prefijo de la factura que corrige

### Requirement: Una nota de crédito declara por qué corrige

Una nota de crédito DEBE (MUST) guardar un motivo, y la emisión DEBE rechazarse si viene vacío.
El motivo es texto libre.

Es lo que hace que anular tenga la única parte que valía la pena de anular: quede escrito por qué.
No se declara un catálogo de conceptos —los códigos de la DIAN son datos tributarios y este cambio
los deja fuera a propósito—; cuando llegue, el concepto se mapea junto al motivo sin tocar lo
guardado.

#### Scenario: Sin motivo no se emite

- **WHEN** se intenta emitir una nota de crédito sin motivo
- **THEN** la emisión se rechaza y el documento sigue siendo borrador

#### Scenario: El motivo queda con el documento

- **WHEN** se abre una nota de crédito emitida
- **THEN** muestra el motivo con el que se emitió

### Requirement: Una nota de crédito puede partir de la factura que corrige

Crear una nota de crédito desde una factura emitida DEBE (MUST) poder rellenar el borrador con los
datos y las líneas de esa factura, ya referenciada. Lo rellenado DEBE ser editable, para dejar
tanto la corrección total como la parcial.

El caso dominante es corregir la factura entera. Sin esto, corregir una factura de treinta líneas
es teclearlas otra vez, que es a la vez el trabajo más aburrido y el más fácil de equivocar.

#### Scenario: Se parte de la factura corregida

- **WHEN** se crea una nota de crédito desde una factura emitida de tres líneas
- **THEN** el borrador aparece con esas tres líneas, sus datos y la referencia ya puesta

#### Scenario: Lo rellenado se puede recortar

- **WHEN** se quitan dos de esas líneas y se emite
- **THEN** la nota de crédito queda con una sola línea y sigue referenciando la misma factura

### Requirement: Corregir es la única forma de cambiar el efecto de un documento emitido

El sistema NO DEBE (MUST NOT) ofrecer anular, borrar ni editar un documento emitido. La única
forma de cambiar su efecto DEBE (MUST) ser emitir una nota de crédito que lo corrija.

Un estado «anulada» que se cambia con un botón es una edición de un documento entregado a un
cliente con otro nombre. La corrección deja rastro de los dos documentos; el botón, de ninguno.

#### Scenario: No hay anulación

- **WHEN** se recorre lo que se puede hacer con un documento emitido
- **THEN** no existe ninguna acción de anular ni de borrar, ni ningún estado «anulada»

#### Scenario: Anular es corregirlo entero

- **WHEN** se quiere dejar sin efecto una factura emitida completa
- **THEN** se hace emitiendo una nota de crédito que la referencia, con su motivo, y quedan los dos
  documentos

#### Scenario: Un borrador sí se borra

- **WHEN** se borra un borrador
- **THEN** desaparece, porque nunca fue un documento entregado a nadie
