## ADDED Requirements

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
