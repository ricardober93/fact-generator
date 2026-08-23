# invoice-numbering Specification

## Purpose

TBD - created by archiving change invoice-issuance. Update Purpose after archive.

## Requirements

### Requirement: Un rango de numeración declara su prefijo, sus extremos y su vigencia

Un rango DEBE (MUST) declarar su **dueño**, la **serie** que numera, un prefijo, el primer y el
último consecutivo que puede entregar, un intervalo de vigencia y el siguiente consecutivo por
entregar. El prefijo PUEDE estar vacío; el dueño y la serie NO DEBEN (MUST NOT) estarlo.

El dueño y la serie son claves que la numeración **no interpreta**: parte los rangos por ellas y
nada más. Quien las usa decide qué significan —facturación numera las series `factura` y
`notaCredito`, y da como dueño el identificador de la empresa emisora—, de modo que ni numerar
remisiones más adelante ni saber qué es una empresa obliga a tocar la numeración. Es la misma regla
de opacidad que rige entre aplicaciones, aplicada entre módulos.

Que el dueño sea obligatorio es lo que separa una resolución de un contador: las resoluciones se
conceden a un emisor concreto y dos emisores no comparten consecutivos. La numeración sostiene esa
regla sin aprender qué es un emisor.

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

#### Scenario: Un rango sin dueño no se crea

- **WHEN** se intenta crear un rango sin dueño
- **THEN** la creación falla y no queda ningún rango guardado

### Requirement: Emitir consume el siguiente consecutivo de forma atómica

Emitir DEBE (MUST) indicar el dueño y la serie, y sólo PUEDE tomar consecutivos de rangos de ese
dueño y esa serie. Emitir sin indicar número DEBE tomar el siguiente consecutivo de un rango
vigente, y DEBE avanzar el puntero del rango. Leer el puntero, comprobarlo y escribirlo DEBEN
ocurrir como una sola operación indivisible por rango.

El rango de otro dueño NO DEBE (MUST NOT) entregar número ni contar como rango vigente: para quien
emite es como si no existiera, igual que un documento ajeno. Sin esa frontera, dos emisores se
repartirían sin querer un mismo consecutivo, que en un registro fiscal es el peor fallo posible.

Sin esa indivisibilidad, dos emisiones simultáneas leen el mismo puntero y entregan el mismo
número a dos documentos distintos. Es exactamente el fallo que el bloqueo optimista ya evita al
guardar.

#### Scenario: Dos emisiones seguidas no repiten número

- **WHEN** se emiten dos documentos seguidos contra el mismo rango
- **THEN** reciben consecutivos distintos y el puntero queda dos posiciones por delante

#### Scenario: El número emitido lleva el prefijo de su rango

- **WHEN** se emite contra un rango de prefijo `FE`
- **THEN** el documento queda con ese prefijo y el consecutivo entregado

#### Scenario: Sin rango vigente no se emite

- **WHEN** se emite y no hay ningún rango vigente para ese tipo de documento
- **THEN** la emisión se rechaza con un mensaje que dice que hay que crear un rango, y el
  documento sigue siendo borrador

#### Scenario: Los rangos de otro dueño no se ven

- **WHEN** se emite para un dueño que no tiene ningún rango, y otro dueño sí tiene uno vigente para
  esa serie
- **THEN** la emisión se rechaza igual que si no existiera ningún rango, y el puntero del rango
  ajeno no se mueve

### Requirement: Se puede emitir con un número dado, dentro de un rango y libre

Emitir PUEDE indicar el número a usar. Ese número DEBE (MUST) pertenecer a un rango vigente **del
mismo dueño**, la misma serie y el mismo prefijo, y NO DEBE (MUST NOT) estar ya usado por otro
documento. Si es igual o posterior al puntero del rango, el puntero DEBE quedar justo detrás de él;
si es anterior y está libre, rellena el hueco y el puntero no retrocede.

Existe para un caso acotado y real: arrancar continuando el consecutivo de un sistema anterior, o
registrar un documento de un talonario preimpreso. Un consecutivo que cualquiera pueda teclear no
garantizaría ni unicidad ni pertenencia a la resolución, y entonces el rango sería decoración.

#### Scenario: Un número por delante del puntero adelanta el rango

- **WHEN** se emite indicando el 1500 en un rango de 1000 a 1999 cuyo puntero está en 1200
- **THEN** el documento queda con el 1500 y el puntero pasa a 1501

#### Scenario: Un hueco se rellena sin mover el puntero

- **WHEN** se emite indicando el 1100, que está libre, con el puntero en 1200
- **THEN** el documento queda con el 1100 y el puntero sigue en 1200

#### Scenario: Un número ya usado se rechaza

- **WHEN** se emite indicando un número que ya tiene otro documento emitido del mismo tipo y
  prefijo
- **THEN** la emisión se rechaza y el documento sigue siendo borrador

#### Scenario: Un número fuera de todo rango se rechaza

- **WHEN** se emite indicando un número que no cae dentro de ningún rango vigente
- **THEN** la emisión se rechaza

#### Scenario: Un número que sólo cae en el rango de otro dueño se rechaza

- **WHEN** se emite indicando un número que sólo cae dentro de un rango vigente de otro dueño
- **THEN** la emisión se rechaza igual que si el número no cayera en ningún rango

### Requirement: Un rango agotado o fuera de vigencia no entrega números

Un rango cuyo puntero ha pasado su último consecutivo, o cuya vigencia no cubre el instante de la
emisión, NO DEBE (MUST NOT) entregar ningún número. Si no queda ningún otro rango utilizable, la
emisión DEBE rechazarse diciendo cuál de las dos cosas ocurre.

#### Scenario: Rango agotado

- **WHEN** se emite contra un rango cuyo puntero ya pasó su último consecutivo
- **THEN** la emisión se rechaza diciendo que el rango está agotado

#### Scenario: Rango caducado

- **WHEN** se emite contra un rango cuya vigencia terminó ayer
- **THEN** la emisión se rechaza diciendo que el rango está fuera de vigencia

#### Scenario: Se pasa al siguiente rango utilizable

- **WHEN** hay un rango agotado y otro vigente con números disponibles para el mismo tipo
- **THEN** la emisión toma el consecutivo del vigente

### Requirement: Dos rangos de la misma serie y prefijo no se solapan

Al crear un rango, el sistema DEBE (MUST) rechazarlo si sus consecutivos se solapan con los de otro
rango **del mismo dueño**, la misma serie y el mismo prefijo. Dos rangos disjuntos con el mismo
prefijo SÍ son válidos, y dos dueños distintos PUEDEN usar el mismo tramo con la misma serie y el
mismo prefijo: sus resoluciones son independientes.

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

#### Scenario: El mismo tramo con otro dueño sí vale

- **WHEN** un dueño tiene un rango de 1000 a 1999 con prefijo `FE` y otro dueño crea ese mismo tramo
  con la misma serie y el mismo prefijo
- **THEN** los dos quedan guardados
