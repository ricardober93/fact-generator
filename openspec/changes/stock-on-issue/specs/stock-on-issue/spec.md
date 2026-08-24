## ADDED Requirements

### Requirement: Emitir consume existencias

Emitir un documento DEBE (MUST) restar de las existencias, por cada línea que traiga referencia
resoluble y cantidad utilizable, la cantidad de esa línea. Cada resta DEBE dejar un movimiento con el
documento como motivo y con quien emite como autor.

El consumo DEBE ocurrir después de que el documento quede guardado como emitido, nunca antes: el
documento fiscal es lo irreversible y no puede quedar pendiente de algo que sí se puede deshacer.

#### Scenario: Una venta baja las existencias

- **WHEN** se emite una factura con una línea de tres unidades de un artículo que tenía diez
- **THEN** el artículo queda con siete y hay un movimiento que dice que varió en menos tres

#### Scenario: El movimiento apunta al documento y a quien emitió

- **WHEN** un cajero emite una factura que consume existencias
- **THEN** el movimiento guarda ese documento como motivo y el nombre del cajero como autor

#### Scenario: Se consume sólo después de quedar emitido

- **WHEN** se emite un documento
- **THEN** el documento ya está guardado como emitido en el instante en que se intenta el consumo

#### Scenario: Vender no exige ser administrador

- **WHEN** un cajero emite una factura con líneas de catálogo
- **THEN** las existencias se mueven, aunque ajustar a mano le esté prohibido

### Requirement: Lo que no se puede resolver no se adivina

Una línea sin referencia, con una referencia que no resuelve a un artículo de la empresa, o sin
cantidad utilizable, NO DEBE (MUST NOT) mover existencias, y NO DEBE impedir ni retrasar la emisión.

Es el mismo criterio con el que la comprobación aritmética salta las líneas sin cantidad en vez de
suponer que es uno. Dos criterios distintos para el mismo dato ausente es como empiezan los
descuadres.

#### Scenario: Una línea escrita a mano no mueve nada

- **WHEN** se emite una factura cuyas líneas se escribieron a mano, sin referencia
- **THEN** no se crea ningún movimiento y la emisión termina con normalidad

#### Scenario: Una referencia ajena no mueve nada

- **WHEN** se emite una factura con líneas de un origen externo, cuyas referencias no son de ningún
  artículo propio
- **THEN** no se crea ningún movimiento y no se registra ningún fallo

#### Scenario: Una línea sin cantidad no mueve nada

- **WHEN** se emite una factura con una línea con referencia pero sin cantidad utilizable
- **THEN** esa línea no mueve existencias, y las demás líneas sí se consumen

### Requirement: Las existencias nunca impiden emitir

Que no haya existencias suficientes NO DEBE (MUST NOT) rechazar ni retrasar una emisión, y la
cantidad DEBE poder quedar en negativo. NO DEBE existir ninguna comprobación de disponibilidad
previa a emitir.

En un mostrador la mercancía ya salió de la estantería cuando se cobra: un dato de inventario
equivocado no puede impedir facturar lo que el cliente tiene en la mano. El negativo es visible y se
corrige con un ajuste a mano, que exige motivo.

#### Scenario: Se vende más de lo que hay

- **WHEN** se emite una factura de cinco unidades de un artículo que tenía dos
- **THEN** la factura queda emitida y el artículo queda en menos tres

#### Scenario: Un artículo en cero se vende igual

- **WHEN** se emite una factura con un artículo cuya cantidad es cero
- **THEN** la emisión no se rechaza por ese motivo

### Requirement: Un consumo que no se aplica queda escrito, y no tumba la emisión

Si un consumo no se puede aplicar, la emisión DEBE (MUST) terminar igual y con el mismo resultado que
si se hubiera aplicado. Lo que no se pudo aplicar DEBE quedar registrado como consumo pendiente, con
el documento, la referencia, la cantidad y el motivo por el que no pudo.

Un consumo pendiente NO DEBE (MUST NOT) contar como movimiento ni entrar en el libro: nada se movió,
y sumarlo rompería que el libro explique la cantidad.

NO DEBE reintentarse solo. Se cierra con un ajuste a mano, que ya exige motivo.

#### Scenario: La emisión no se entera del fallo

- **WHEN** el consumo de existencias falla al emitir
- **THEN** el documento queda emitido, numerado, y la respuesta es la misma que si no hubiera fallado

#### Scenario: El fallo queda visible

- **WHEN** un consumo no se puede aplicar
- **THEN** queda un consumo pendiente con el documento, la referencia, la cantidad y el motivo

#### Scenario: Un pendiente no descuadra el libro

- **WHEN** hay consumos pendientes de un artículo y se suman sus movimientos
- **THEN** la suma sigue coincidiendo con la cantidad actual del artículo

### Requirement: Corregir devuelve la mercancía

Un documento que corrige a otro DEBE (MUST) mover las existencias con el signo contrario, por el
mismo camino y con las mismas reglas de resolución que una venta.

Anular no existe: una venta se corrige con una nota de crédito, así que es el único sitio del que
puede colgar la devolución. Sin esto, corregir dejaría el inventario descuadrado para siempre.

#### Scenario: Una nota de crédito devuelve al almacén

- **WHEN** se emite una nota de crédito de dos unidades de un artículo que tenía siete
- **THEN** el artículo queda con nueve y hay un movimiento que dice que varió en más dos

#### Scenario: La devolución se salta lo mismo que la venta

- **WHEN** se emite una nota de crédito con una línea sin referencia resoluble
- **THEN** esa línea no mueve existencias y la emisión termina con normalidad

### Requirement: Reemitir no vuelve a consumir

Emitir un documento ya emitido NO DEBE (MUST NOT) crear ningún movimiento nuevo.

No hace falta clave de idempotencia: emitir es siempre «emite este borrador», un documento ya emitido
se devuelve tal cual antes de tocar nada, y todo ocurre bajo el cerrojo del documento.

#### Scenario: La segunda emisión no mueve nada

- **WHEN** se emite dos veces seguidas el mismo documento
- **THEN** las existencias se movieron una sola vez

#### Scenario: Dos emisiones a la vez consumen una vez

- **WHEN** se lanzan dos emisiones simultáneas del mismo borrador
- **THEN** una emite y consume, y la otra devuelve el documento emitido sin consumir
