## ADDED Requirements

### Requirement: Cada artículo tiene una cantidad, y un libro que la explica

Un artículo DEBE (MUST) tener una cantidad de existencias, y todo cambio de esa cantidad DEBE dejar
un movimiento con lo que varió. Un artículo recién creado DEBE empezar en cero.

La cantidad vive en el artículo y no se calcula sumando el libro porque el adaptador PG no proyecta
columnas: sumar movimientos por artículo en un listado leería entero cada movimiento de la historia.
El libro está para explicar el número, no para producirlo.

#### Scenario: Un artículo nuevo empieza en cero

- **WHEN** se da de alta un artículo
- **THEN** su cantidad de existencias es cero y no hay ningún movimiento

#### Scenario: Ajustar cambia la cantidad y deja movimiento

- **WHEN** se ajusta un artículo de cero a diez
- **THEN** su cantidad pasa a diez y queda un movimiento que dice que varió en diez

#### Scenario: El libro explica la cantidad

- **WHEN** se ajusta un artículo dos veces y se leen sus movimientos
- **THEN** la suma de lo que varió cada uno coincide con la cantidad actual

### Requirement: Un ajuste exige motivo

Ajustar existencias DEBE (MUST) exigir un motivo no vacío. Un ajuste sin motivo NO DEBE (MUST NOT)
guardarse, y la cantidad NO DEBE cambiar.

Es la misma regla que ya impide anular una factura y obliga a la nota de crédito a decir por qué,
aplicada a la otra cosa del sistema que cuadra o no cuadra. Un ajuste anónimo es un descuadre que
nadie podrá explicar tres meses después.

#### Scenario: Sin motivo no se ajusta

- **WHEN** se intenta ajustar un artículo sin motivo, o con el motivo en blanco
- **THEN** el ajuste se rechaza y la cantidad sigue igual

#### Scenario: El motivo queda guardado

- **WHEN** se ajusta un artículo dando un motivo
- **THEN** el movimiento guarda ese motivo tal cual

### Requirement: Cada movimiento dice quién y cuándo

Un movimiento DEBE (MUST) guardar el instante en que ocurrió y quién lo hizo, con su nombre, como ya
hace la emisión de un documento.

Sin el autor, el motivo sólo cuenta la mitad: explica qué pasó y no a quién preguntarle.

#### Scenario: Queda el autor y el instante

- **WHEN** un administrador ajusta un artículo
- **THEN** el movimiento guarda su nombre y el instante del ajuste

#### Scenario: El autor no cambia después

- **WHEN** se renombra al usuario que hizo un ajuste
- **THEN** el movimiento sigue mostrando el nombre con el que se hizo

### Requirement: Sólo administración ajusta existencias a mano

Ajustar existencias a mano DEBE (MUST) exigir rol de administrador. Cajero y lectura DEBEN poder ver
la cantidad y NO DEBEN poder ajustarla.

Dice «a mano» porque ajustar es corregir el número sin que haya pasado nada en el negocio, y eso es
cosa de administración. Un movimiento que nazca de una operación —vender, por ejemplo— lo autoriza
esa operación y no este requisito; sin la palabra, este requisito acabaría diciendo que quien vende
no puede vender.

#### Scenario: El cajero ve y no ajusta

- **WHEN** un cajero abre un artículo e intenta ajustar sus existencias
- **THEN** ve la cantidad, y el ajuste se rechaza antes de tocar el dominio

#### Scenario: Lectura tampoco ajusta

- **WHEN** un usuario de sólo lectura intenta ajustar existencias
- **THEN** la acción se rechaza
