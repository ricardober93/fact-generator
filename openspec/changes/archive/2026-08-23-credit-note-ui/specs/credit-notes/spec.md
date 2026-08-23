## ADDED Requirements

### Requirement: Se llega a corregir desde la factura emitida

Una factura emitida DEBE (MUST) ofrecer la acción de corregirla. Usarla DEBE crear la nota de
crédito que parte de ella y llevar directamente a su borrador. Un borrador NO DEBE (MUST NOT)
ofrecerla: lo que todavía se edita no se corrige, se edita.

Sin esta puerta, corregir existe en el modelo y no existe para quien usa la aplicación, que es lo
mismo que no existir —y `credit-notes` ya no deja ninguna otra forma de cambiar el efecto de un
documento emitido—.

#### Scenario: La factura emitida ofrece corregirse

- **WHEN** se abre una factura emitida
- **THEN** aparece la acción de corregirla

#### Scenario: Corregir deja el borrador listo

- **WHEN** se usa esa acción sobre una factura emitida de tres líneas
- **THEN** se llega al borrador de una nota de crédito con esas tres líneas y la referencia puesta

#### Scenario: Un borrador no se corrige

- **WHEN** se abre un borrador
- **THEN** no aparece ninguna acción de corregir

### Requirement: Una nota de crédito enseña a quién corrige

El borrador y el documento emitido de una nota de crédito DEBEN (MUST) mostrar el prefijo y el
número de la factura que corrigen, y DEBEN enlazar a ella. Se muestran los que se guardaron al
crearla, no los que tenga la otra factura en ese momento.

#### Scenario: La referencia está a la vista

- **WHEN** se abre una nota de crédito que corrige la factura `FE1247`
- **THEN** se ve `FE1247` y se puede abrir esa factura desde ahí

#### Scenario: Una factura no enseña ninguna referencia

- **WHEN** se abre una factura
- **THEN** no se muestra ninguna referencia de corrección

### Requirement: El motivo se escribe en el formulario

El formulario de una nota de crédito DEBE (MUST) ofrecer un campo para su motivo, guardarlo junto
con el resto del borrador y señalarlo como obligatorio. El formulario de una factura NO DEBE (MUST
NOT) ofrecerlo.

El motivo ya era obligatorio para emitir; sin campo, la emisión se rechazaba por un dato que no
había forma de rellenar.

#### Scenario: La nota de crédito pide su motivo

- **WHEN** se abre el borrador de una nota de crédito
- **THEN** hay un campo de motivo señalado como obligatorio

#### Scenario: El motivo se guarda con el borrador

- **WHEN** se escribe un motivo y se guarda
- **THEN** al volver a abrir el documento el motivo sigue ahí

#### Scenario: Una factura no tiene motivo

- **WHEN** se abre el formulario de una factura
- **THEN** no aparece ningún campo de motivo
