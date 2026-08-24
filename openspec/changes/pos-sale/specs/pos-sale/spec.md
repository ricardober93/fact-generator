## ADDED Requirements

### Requirement: Vender es elegir del catálogo y cerrar

La pantalla de venta DEBE (MUST) permitir buscar en el catálogo, añadir una línea con lo elegido,
cambiar su cantidad, quitarla, y ver el total en todo momento. DEBE permitir además corregir a mano
la descripción y el precio de una línea, y escribir una línea sin elegirla del catálogo.

Es la misma línea de siempre: elegir del catálogo la rellena, no la ata. Un mostrador vende cosas que
no están en el catálogo y las vende igual.

#### Scenario: Elegir del catálogo añade una línea

- **WHEN** se busca un artículo y se elige
- **THEN** aparece una línea con su descripción, su precio y cantidad uno

#### Scenario: La cantidad cambia el total

- **WHEN** se pone cantidad tres en una línea de precio diez
- **THEN** el importe de la línea es treinta y el total lo refleja

#### Scenario: Una línea a mano es una línea

- **WHEN** se escribe una línea sin elegirla del catálogo
- **THEN** se vende igual que las demás

#### Scenario: Quitar una línea no toca las demás

- **WHEN** se quita la segunda de tres líneas
- **THEN** quedan la primera y la tercera con sus valores intactos

### Requirement: Cerrar la venta emite un documento

Cerrar la venta DEBE (MUST) producir una factura **emitida y numerada**, no un borrador. La factura
DEBE ser una factura corriente, indistinguible de una hecha en el editor.

No hay documento de venta aparte del fiscal. Un tique que luego «se convierte» en factura son dos
registros de la misma transacción y dos sitios donde puede estar la verdad.

#### Scenario: Al cerrar sale una factura emitida

- **WHEN** se cierra una venta con dos líneas
- **THEN** queda una factura emitida, con su número, y con esas dos líneas

#### Scenario: La venta no deja borrador detrás

- **WHEN** se cierra una venta correctamente
- **THEN** no queda ningún borrador de esa venta

#### Scenario: Lo emitido desde el POS se lista como cualquier factura

- **WHEN** se abre la lista de facturas después de vender
- **THEN** la venta aparece como una factura emitida más

### Requirement: Un rechazo no deja rastro ni pierde lo escrito

Si la emisión se rechaza, la venta NO DEBE (MUST NOT) dejar ningún borrador guardado, y el motivo
DEBE mostrarse tal como lo da la emisión. Las líneas que la persona tenía en pantalla DEBEN seguir
ahí.

El rechazo típico —no hay rango vigente— no se arregla desde el POS y se repetiría en cada intento:
sin borrar, la lista de facturas se llenaría de borradores idénticos de una venta que nunca ocurrió.

#### Scenario: Sin rango vigente no se vende y no queda borrador

- **WHEN** se cierra una venta y no hay rango vigente
- **THEN** se dice que hay que crear un rango, no queda ningún borrador, y las líneas siguen en
  pantalla

#### Scenario: Un rechazo nunca borra un documento emitido

- **WHEN** una venta se rechaza después de que el documento quedara emitido
- **THEN** el documento emitido no se borra

### Requirement: Sólo se ofrece vender con plantillas que el POS puede rellenar

Al abrir la pantalla, el sistema DEBE (MUST) ofrecer únicamente las plantillas cuyos campos
obligatorios el punto de venta puede rellenar. Si no hay ninguna, la pantalla DEBE decirlo, nombrar
lo que falta, y NO DEBE dejar vender.

Comprobarlo al cerrar es el peor momento posible: el cajero descubriría que no puede facturar con el
cliente esperando. Un fallo previsible se adelanta al único instante en que todavía no cuesta nada.

#### Scenario: Una plantilla que pide un campo que el POS no rellena no se ofrece

- **WHEN** una plantilla exige un campo obligatorio que el punto de venta no sabe rellenar
- **THEN** esa plantilla no aparece entre las vendibles

#### Scenario: Sin plantillas vendibles la pantalla lo explica

- **WHEN** se abre el punto de venta y ninguna plantilla sirve
- **THEN** se dice qué campo lo impide y no se puede vender

#### Scenario: Con varias vendibles se elige

- **WHEN** hay más de una plantilla vendible
- **THEN** se puede elegir con cuál se vende, y hay una por defecto

### Requirement: El cliente por defecto es el de mostrador

Si la plantilla exige nombre de cliente, el punto de venta DEBE (MUST) rellenarlo con un valor de
mostrador por defecto y DEBE permitir cambiarlo antes de cerrar.

Es lo que ocurre en casi todas las ventas de mostrador. Exigir teclear el nombre en cada una haría el
POS más lento que el editor, que es justo lo contrario de para lo que existe.

#### Scenario: Sin tocar nada, la factura sale a nombre del mostrador

- **WHEN** se cierra una venta sin escribir cliente
- **THEN** la factura queda con el cliente por defecto

#### Scenario: El cliente se puede cambiar

- **WHEN** se escribe un nombre de cliente antes de cerrar
- **THEN** la factura queda a ese nombre

### Requirement: Vender es cosa del cajero

Vender DEBE (MUST) exigir rol de cajero o de administrador. Un usuario de sólo lectura NO DEBE (MUST
NOT) poder vender, y sin sesión la pantalla DEBE responder como cualquier ruta protegida.

#### Scenario: El cajero vende

- **WHEN** un cajero cierra una venta
- **THEN** la factura queda emitida a su nombre

#### Scenario: Lectura no vende

- **WHEN** un usuario de sólo lectura intenta cerrar una venta
- **THEN** se rechaza antes de tocar el dominio

#### Scenario: Sin sesión responde como cualquier ruta protegida

- **WHEN** se abre el punto de venta sin sesión
- **THEN** responde como cualquier ruta protegida, sin revelar si el rol habría bastado
