## MODIFIED Requirements

### Requirement: Las líneas de la factura se añaden y se quitan

El formulario DEBE (MUST) permitir añadir una línea, quitarla y reordenarla. Una factura PUEDE no
tener ninguna línea.

Quitar una línea NO DEBE (MUST NOT) alterar los valores de las demás.

Una línea PUEDE guardar además una referencia opaca al origen del que se eligió. Esa referencia se
guarda **junto a** sus valores y nunca en lugar de ellos: lo que se pinta y lo que se congela siguen
siendo el texto y el precio de la línea.

#### Scenario: Añadir una línea

- **WHEN** se añade una línea
- **THEN** aparece una fila vacía con una columna por cada camino de ítem del schema

#### Scenario: Quitar una línea del medio

- **WHEN** se quita la segunda de tres líneas
- **THEN** quedan la primera y la tercera con sus valores intactos

#### Scenario: Una línea con referencia se guarda como cualquier otra

- **WHEN** se guarda una factura con una línea que trae referencia de origen
- **THEN** quedan almacenados sus valores y su referencia, y al pintarla se usan sus valores
