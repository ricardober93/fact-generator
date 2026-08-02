# invoice-records Specification

## Purpose

La factura como registro de datos: qué guarda y qué nunca guarda, el formulario derivado
del schema del documento, el visualizador en vivo, el cambio de diseño sobre la marcha, la
impresión y la detección de datos que ya no encajan con su plantilla. No cubre el modelo
del documento ni cómo se pinta —eso es `invoice-document-model` e `invoice-renderer`—, ni
la edición del diseño, que es `template-editor`.

## Requirements

### Requirement: Una factura guarda datos, nunca un papel

Una factura DEBE (MUST) guardar el identificador de la plantilla con la que se pinta por defecto,
los datos de la factura, la lista de sus líneas y los parámetros del embed. NO DEBE (MUST NOT)
guardar el HTML renderizado, ningún PDF, ninguna imagen del documento ni una copia del diseño.

El papel se vuelve a pintar en cada visita a partir de los datos guardados y de la plantilla **en el
estado en que esté en ese momento**. Es lo que permite retocar un diseño y que las facturas ya
emitidas salgan con el retoque.

Guardar una factura DEBE validar que los datos obligatorios que declara su plantilla están
presentes, con el mismo criterio que usa el render.

#### Scenario: Lo que se guarda

- **WHEN** se guarda una factura
- **THEN** quedan almacenados la plantilla, los datos, las líneas y los parámetros, y nada más

#### Scenario: Retocar el diseño alcanza a las facturas viejas

- **WHEN** se guarda una factura, se cambia después un color de la plantilla y se vuelve a abrir
- **THEN** la factura se pinta con el color nuevo, sin haber tocado sus datos

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

El formulario NO DEBE (MUST NOT) escribirse a mano por diseño: una plantilla que declara un camino
nuevo obtiene su campo sin tocar el formulario.

#### Scenario: Los campos salen del schema

- **WHEN** se abre el formulario de una factura sobre una plantilla que declara `cliente.nombre`
- **THEN** aparece un campo para `cliente.nombre`

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

### Requirement: Las líneas de la factura se añaden y se quitan

El formulario DEBE (MUST) permitir añadir una línea, quitarla y reordenarla. Una factura PUEDE no
tener ninguna línea.

Quitar una línea NO DEBE (MUST NOT) alterar los valores de las demás.

#### Scenario: Añadir una línea

- **WHEN** se añade una línea
- **THEN** aparece una fila vacía con una columna por cada camino de ítem del schema

#### Scenario: Quitar una línea del medio

- **WHEN** se quita la segunda de tres líneas
- **THEN** quedan la primera y la tercera con sus valores intactos

### Requirement: Los totales se calculan como comodidad, pero se guardan como datos

El formulario DEBE (MUST) calcular el importe de una línea a partir de su cantidad y su precio, y
escribir el resultado en el campo correspondiente. Ese campo DEBE seguir siendo editable: lo que se
guarda es lo que hay en el campo, no el resultado del cálculo.

Ni el servidor ni el render DEBEN (MUST NOT) recalcular ningún importe. La aritmética ocurre en un
único sitio, de modo que lo que se ve en pantalla y lo que queda guardado no pueden discrepar.

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

### Requirement: El visualizador pinta en vivo con el motor de render

Junto al formulario DEBE (MUST) verse el documento pintado con la misma función `render` que usa el
embed, alimentada por lo que hay en el formulario en ese momento. El visualizador DEBE actualizarse
al escribir, sin viaje al servidor y sin guardar.

El documento del visualizador NO DEBE (MUST NOT) verse afectado por los estilos de la aplicación,
con la misma garantía que ya rige para el lienzo del editor.

#### Scenario: Escribir se ve al momento

- **WHEN** se escribe el nombre del cliente en el formulario
- **THEN** el visualizador lo muestra sin recargar y sin haber guardado

#### Scenario: Es el mismo render que el del embed

- **WHEN** se compara el marcado del visualizador con el que produce el embed para los mismos datos
- **THEN** el documento pintado es el mismo

### Requirement: El diseño se cambia sobre la marcha

El visualizador DEBE (MUST) permitir cambiar la plantilla con la que se pinta la factura, entre las
que admiten sus datos. Cambiarla NO DEBE (MUST NOT) alterar ningún dato de la factura.

La plantilla elegida se guarda con la factura como la que usa por defecto.

#### Scenario: La misma factura en otro papel

- **WHEN** se cambia el diseño de una factura de `chevron-slate` a `bars-navy`
- **THEN** el visualizador la pinta con el diseño nuevo y sus datos no cambian

#### Scenario: El diseño elegido se recuerda

- **WHEN** se cambia el diseño, se guarda y se vuelve a abrir la factura
- **THEN** se pinta con el diseño elegido

### Requirement: Al imprimir sólo sale el papel

La página de una factura DEBE (MUST) imprimir únicamente el documento. El formulario, la barra de
herramientas y cualquier otro elemento de la aplicación NO DEBEN (MUST NOT) aparecer en el papel.

La salida a PDF es la del propio diálogo de impresión del navegador. NO DEBE existir ningún endpoint
que genere un PDF ni ningún archivo de PDF almacenado.

#### Scenario: El chrome no se imprime

- **WHEN** se imprime la página de una factura
- **THEN** el papel contiene el documento y no contiene el formulario ni la barra de herramientas

#### Scenario: No hay PDF de servidor

- **WHEN** se recorre la superficie HTTP de las facturas
- **THEN** no existe ninguna ruta que devuelva un PDF

### Requirement: El número de factura lo escribe la persona

El número de factura DEBE (MUST) ser un campo que rellena quien crea la factura. El sistema NO DEBE
(MUST NOT) asignarlo, ni reservarlo, ni llevar una secuencia, ni rechazar un número repetido.

Si al guardar ya existe otra factura con ese número, DEBE avisarse junto al campo. El aviso NO DEBE
impedir guardar.

#### Scenario: Un número repetido avisa pero pasa

- **WHEN** se guarda una factura con un número que ya tiene otra
- **THEN** la factura se guarda y se avisa de que el número está repetido

#### Scenario: Nadie rellena el número por ti

- **WHEN** se abre el formulario de una factura nueva
- **THEN** el número viene vacío

### Requirement: Se avisa cuando los datos guardados ya no encajan con la plantilla

Al abrir una factura guardada, DEBE (MUST) compararse lo que tiene almacenado con el `dataSchema` de
su plantilla actual. Si la plantilla pide caminos que la factura no tiene, o la factura guarda
caminos que la plantilla ya no usa, DEBE decirse cuáles.

Los datos guardados NO DEBEN (MUST NOT) modificarse ni borrarse por ese desajuste: la factura se
sigue pudiendo abrir y corregir.

#### Scenario: La plantilla pide un camino que la factura no tiene

- **WHEN** se abre una factura cuyos datos no cubren un camino que su plantilla declara
- **THEN** se nombra ese camino y la factura se abre igualmente

#### Scenario: La factura guarda un camino que la plantilla ya no usa

- **WHEN** se reenlaza un texto de la plantilla a otro camino y se abre una factura anterior
- **THEN** se avisa de que el dato guardado quedó huérfano y su valor sigue almacenado

#### Scenario: Sin desajuste no hay ruido

- **WHEN** se abre una factura cuyos datos encajan con su plantilla
- **THEN** no se muestra ningún aviso

### Requirement: Las facturas guardadas se listan

DEBE (MUST) existir una lista de las facturas guardadas que muestre, por cada una, su número, su
cliente, su total y la fecha. Desde la lista se DEBE poder abrir una factura y crear una nueva.

#### Scenario: La lista enseña lo que hace falta para reconocer una factura

- **WHEN** hay facturas guardadas y se abre la lista
- **THEN** cada fila muestra número, cliente, total y fecha, y enlaza a la factura

#### Scenario: Sin facturas la lista lo dice

- **WHEN** no hay ninguna factura guardada
- **THEN** la lista lo dice y ofrece crear la primera
