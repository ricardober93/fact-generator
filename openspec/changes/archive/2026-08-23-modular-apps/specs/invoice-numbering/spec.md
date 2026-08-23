## MODIFIED Requirements

### Requirement: Un rango de numeración declara su prefijo, sus extremos y su vigencia

Un rango DEBE (MUST) declarar la **serie** que numera, un prefijo, el primer y el último consecutivo
que puede entregar, un intervalo de vigencia y el siguiente consecutivo por entregar. El prefijo PUEDE
estar vacío.

La serie es una clave que la numeración **no interpreta**: parte los rangos por ella y nada más. Quien
la usa decide qué significa —facturación numera las series `factura` y `notaCredito`—, de modo que
numerar remisiones o recibos más adelante no obliga a tocar la numeración. Es la misma regla de
opacidad que rige entre aplicaciones, aplicada entre módulos.

Es la forma que ya tiene una resolución de numeración, de modo que activar la facturación
electrónica más adelante no obliga a cambiar el modelo.

#### Scenario: Un rango recién creado apunta a su primer número

- **WHEN** se crea un rango de 1000 a 1999
- **THEN** el siguiente consecutivo por entregar es 1000

#### Scenario: Un rango con extremos imposibles no se crea

- **WHEN** se intenta crear un rango cuyo último consecutivo es menor que el primero
- **THEN** la creación falla y no queda ningún rango guardado

#### Scenario: La numeración no valida un vocabulario ajeno

- **WHEN** se crea un rango para una serie que la numeración nunca ha visto
- **THEN** se crea igual, porque la serie es una clave y no una lista cerrada

### Requirement: Dos rangos de la misma serie y prefijo no se solapan

Al crear un rango, el sistema DEBE (MUST) rechazarlo si sus consecutivos se solapan con los de
otro rango de la misma serie y el mismo prefijo. Dos rangos disjuntos con el mismo
prefijo SÍ son válidos.

Es la única invariante del rango que no puede comprobarse al emitir: dos rangos solapados
entregarían el mismo número dos veces sin que ninguna de las dos emisiones vea nada raro. Y es
también lo que permite repartir el trabajo —una caja que numera sin red recibe simplemente su
propio tramo disjunto—, sin ningún mecanismo adicional.

#### Scenario: Un rango solapado se rechaza

- **WHEN** existe un rango de 1000 a 1999 y se intenta crear otro del mismo tipo y prefijo de 1500
  a 2500
- **THEN** la creación falla y el rango existente no cambia

#### Scenario: Dos tramos disjuntos conviven

- **WHEN** existe un rango de 1000 a 1999 y se crea otro del mismo tipo y prefijo de 2000 a 2999
- **THEN** los dos quedan guardados

#### Scenario: El mismo tramo para otro tipo de documento sí vale

- **WHEN** existe un rango de facturas de 1 a 999 y se crea uno de notas de crédito de 1 a 999
- **THEN** los dos quedan guardados

## RENAMED Requirements

- FROM: `### Requirement: Dos rangos del mismo tipo y prefijo no se solapan`
- TO: `### Requirement: Dos rangos de la misma serie y prefijo no se solapan`
