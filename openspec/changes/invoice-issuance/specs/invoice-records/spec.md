## MODIFIED Requirements

### Requirement: Una factura guarda datos, nunca un papel

Una factura DEBE (MUST) guardar el identificador de la plantilla con la que se pinta por defecto,
los datos de la factura, la lista de sus líneas y los parámetros del embed. NO DEBE (MUST NOT)
guardar el HTML renderizado, ningún PDF, ninguna imagen del documento ni una copia del diseño.

Junto a esos datos, una factura DEBE guardar como **campos propios** —no como rutas dentro del
registro libre— su tipo de documento, su estado, y, una vez emitida, su prefijo, su número y su
instante de emisión. Son los cinco datos que decide el sistema y no la plantilla: por eso no pueden
vivir en un blob que cualquiera edita, y por eso se pueden consultar sin traerse todas las facturas
a memoria.

Junto a ellos, una factura DEBE guardar un **contador de revisión**: un entero que sube en
cada guardado y que solo existe para detectar escrituras que se pisan. NO DEBE (MUST NOT)
guardar las revisiones anteriores: es un contador, no un historial.

El papel se vuelve a pintar en cada visita a partir de los datos guardados y de la plantilla **en el
estado en que esté en ese momento**. Es lo que permite retocar un diseño y que las facturas ya
emitidas salgan con el retoque. Lo que queda congelado al emitir son los **datos**, no el diseño:
el papel es la representación, el registro son los datos.

Guardar una factura DEBE validar que los datos obligatorios que declara su plantilla están
presentes, con el mismo criterio que usa el render.

#### Scenario: Lo que se guarda

- **WHEN** se guarda una factura
- **THEN** quedan almacenados la plantilla, los datos, las líneas, los parámetros, el tipo, el
  estado y el contador de revisión, y nada más

#### Scenario: Lo que se guarda al emitir

- **WHEN** se emite una factura
- **THEN** quedan almacenados además su prefijo, su número y su instante de emisión como campos
  propios

#### Scenario: No se guarda el historial

- **WHEN** se guarda una factura varias veces seguidas
- **THEN** solo queda almacenado el último estado, y del contador solo su valor actual

#### Scenario: Retocar el diseño alcanza a las facturas viejas

- **WHEN** se guarda una factura, se cambia después un color de la plantilla y se vuelve a abrir
- **THEN** la factura se pinta con el color nuevo, sin haber tocado sus datos

#### Scenario: Retocar el diseño también alcanza a las emitidas

- **WHEN** se emite una factura, se cambia después un color de su plantilla y se vuelve a abrir
- **THEN** se pinta con el color nuevo y sus datos congelados no cambian

#### Scenario: Una factura sin sus datos obligatorios no se guarda

- **WHEN** se intenta guardar una factura a la que le falta un dato que su plantilla declara
  obligatorio
- **THEN** el guardado falla nombrando los caminos que faltan y no queda nada almacenado

### Requirement: El formulario se deriva del schema de datos del documento

El formulario de una factura DEBE (MUST) construirse recorriendo el `dataSchema` de la plantilla
elegida. Un camino que empieza por la raíz de ítem DEBE aparecer como columna de la lista de líneas;
cualquier otro, como campo de la factura. El tipo declarado DEBE decidir el control: texto, número,
fecha o casilla.

Un camino declarado obligatorio DEBE señalarse como tal en el formulario.

El camino de número de factura es la excepción: NO DEBE (MUST NOT) ofrecerse como campo editable,
porque el número lo asigna la emisión. La plantilla lo sigue declarando y lo sigue pintando; lo que
desaparece es la casilla donde alguien lo tecleaba.

El formulario NO DEBE escribirse a mano por diseño: una plantilla que declara un camino
nuevo obtiene su campo sin tocar el formulario.

#### Scenario: Los campos salen del schema

- **WHEN** se abre el formulario de una factura sobre una plantilla que declara `cliente.nombre`
- **THEN** aparece un campo para `cliente.nombre`

#### Scenario: El número no es un campo del formulario

- **WHEN** se abre el formulario de una factura sobre una plantilla que declara el camino de número
- **THEN** no aparece ninguna casilla para escribirlo

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

### Requirement: Los totales se calculan como comodidad, pero se guardan como datos

El formulario DEBE (MUST) calcular el importe de una línea a partir de su cantidad y su precio, y
escribir el resultado en el campo correspondiente. Ese campo DEBE seguir siendo editable: lo que se
guarda es lo que hay en el campo, no el resultado del cálculo.

Ni el servidor ni el render DEBEN (MUST NOT) recalcular ningún importe. La aritmética ocurre en un
único sitio, de modo que lo que se ve en pantalla y lo que queda guardado no pueden discrepar.

Al **emitir** —y solo al emitir— el servidor comprueba que esos importes cuadran entre sí y rechaza
la emisión si no lo hacen. Comprobar no es recalcular: el servidor sigue sin escribir ni un
importe. Mientras el documento es borrador, la aritmética sigue siendo enteramente libre.

La aritmética DEBE hacerse de forma que no arrastre error de coma flotante en importes de dos
decimales.

#### Scenario: El importe de una línea se rellena solo

- **WHEN** se escribe cantidad 3 y precio 25,00 en una línea
- **THEN** el importe de esa línea pasa a ser 75,00

#### Scenario: Un importe escrito a mano manda

- **WHEN** se corrige a mano el importe de una línea y se guarda
- **THEN** se guarda el valor escrito a mano

#### Scenario: Los céntimos no derivan

- **WHEN** se suman importes cuya suma en coma flotante daría un valor con cola decimal
- **THEN** el total mostrado tiene dos decimales exactos

#### Scenario: El servidor no recalcula

- **WHEN** se guarda una factura cuyos totales no cuadran con sus líneas
- **THEN** se guardan los totales tal y como se enviaron

#### Scenario: Al emitir sí se comprueban

- **WHEN** se intenta emitir esa misma factura
- **THEN** la emisión se rechaza y los importes guardados siguen siendo los que se enviaron

### Requirement: Se avisa cuando los datos guardados ya no encajan con la plantilla

Al abrir una factura guardada, DEBE (MUST) compararse lo que tiene almacenado con el `dataSchema` de
su plantilla actual. Si la plantilla pide caminos que la factura no tiene, o la factura guarda
caminos que la plantilla ya no usa, DEBE decirse cuáles.

Los datos guardados NO DEBEN (MUST NOT) modificarse ni borrarse por ese desajuste: la factura se
sigue pudiendo abrir y corregir.

En un borrador el aviso es informativo. En una factura **emitida** el mismo desajuste impide
imprimir, porque un papel entregado a un cliente al que le falta un dato obligatorio es peor que un
papel que no sale.

#### Scenario: La plantilla pide un camino que la factura no tiene

- **WHEN** se abre una factura cuyos datos no cubren un camino que su plantilla declara
- **THEN** se nombra ese camino y la factura se abre igualmente

#### Scenario: La factura guarda un camino que la plantilla ya no usa

- **WHEN** se reenlaza un texto de la plantilla a otro camino y se abre una factura anterior
- **THEN** se avisa de que el dato guardado quedó huérfano y su valor sigue almacenado

#### Scenario: En una emitida el desajuste impide imprimir

- **WHEN** se abre una factura emitida cuyos datos no cubren un camino obligatorio de su plantilla
- **THEN** se nombra ese camino y no se puede imprimir

#### Scenario: Sin desajuste no hay ruido

- **WHEN** se abre una factura cuyos datos encajan con su plantilla
- **THEN** no se muestra ningún aviso

### Requirement: Las facturas guardadas se listan

DEBE (MUST) existir una lista de los documentos guardados que muestre, por cada uno, su tipo, su
estado, su número —vacío mientras sea borrador—, su cliente, su total y la fecha. Desde la lista se
DEBE poder abrir un documento y crear uno nuevo.

#### Scenario: La lista enseña lo que hace falta para reconocer un documento

- **WHEN** hay documentos guardados y se abre la lista
- **THEN** cada fila muestra tipo, estado, número, cliente, total y fecha, y enlaza al documento

#### Scenario: Un borrador se distingue de un emitido

- **WHEN** la lista contiene un borrador y una factura emitida
- **THEN** el borrador aparece sin número y marcado como borrador

#### Scenario: Sin facturas la lista lo dice

- **WHEN** no hay ninguna factura guardada
- **THEN** la lista lo dice y ofrece crear la primera

## REMOVED Requirements

### Requirement: El número de factura lo escribe la persona

**Reason**: El documento pasa a ser un registro fiscal. Un consecutivo que se teclea no garantiza
unicidad, ni pertenencia a una resolución de numeración, ni vigencia, y el aviso de número
repetido que no impedía guardar deja de ser aceptable en un documento que se entrega a un cliente.
Lo sustituye `invoice-numbering`: el número sale de un rango al emitir, y se puede indicar a mano
solo si pertenece a un rango vigente y está libre.

**Migration**: Ninguna acción sobre los datos. Las facturas guardadas hasta ahora son borradores y
su número tecleado sigue en sus datos; al emitirlas, el rango asigna el consecutivo y sobrescribe
esa ruta. Para continuar el consecutivo de un sistema anterior se crea un rango que empiece donde
aquel terminó, o se indica el número al emitir.
