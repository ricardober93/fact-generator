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

#### Scenario: La lista enseña lo que hace falta para reconocer una factura

- **WHEN** hay documentos guardados y se abre la lista
- **THEN** cada fila muestra tipo, estado, número, cliente, total y fecha, y enlaza al documento

#### Scenario: Un borrador se distingue de un emitido

- **WHEN** la lista contiene un borrador y una factura emitida
- **THEN** el borrador aparece sin número y marcado como borrador

#### Scenario: Sin facturas la lista lo dice

- **WHEN** no hay ninguna factura guardada
- **THEN** la lista lo dice y ofrece crear la primera

### Requirement: Un guardado que llega tarde no pisa el anterior

Guardar una factura ya existente DEBE (MUST) indicar sobre qué revisión se está escribiendo. Si
esa revisión no es la almacenada, el sistema NO DEBE (MUST NOT) escribir absolutamente nada: ni
los datos, ni las líneas, ni los parámetros, ni el contador.

Sin esta comprobación, dos pestañas abiertas sobre la misma factura hacen que la última en
guardar borre el trabajo de la otra sin que nadie se entere. Es la peor forma de perder datos:
silenciosa y sin rastro.

La comparación y la escritura DEBEN ocurrir como una sola operación indivisible por factura. Una
comprobación que se hace y después se escribe deja una ventana por la que se cuela justo la
carrera que se quería evitar.

#### Scenario: La revisión coincide

- **WHEN** se guarda una factura indicando la revisión que efectivamente está almacenada
- **THEN** los datos quedan guardados y el contador sube en uno

#### Scenario: La revisión se ha quedado atrás

- **WHEN** se guarda una factura indicando una revisión anterior a la almacenada
- **THEN** no se escribe nada y la factura conserva exactamente los datos que ya tenía

#### Scenario: Dos guardados seguidos desde el mismo punto de partida

- **WHEN** dos guardados parten de la misma revisión y se envían uno tras otro
- **THEN** el primero queda guardado y el segundo se rechaza

#### Scenario: Crear una factura no exige revisión

- **WHEN** se guarda una factura que todavía no existe
- **THEN** se crea con la primera revisión, sin que haya que indicar ninguna

### Requirement: Una factura guardada antes de existir el contador se sigue guardando

Una factura almacenada sin contador de revisión DEBE (MUST) tratarse como si su revisión fuera
la inicial, y DEBE poder guardarse sin ningún paso previo, sin migración y sin intervención
manual.

Esa factura NO DEBE (MUST NOT) quedar exenta de la comprobación: si alguien la guardó entretanto,
el guardado que llega tarde se rechaza igual que en cualquier otra.

#### Scenario: Se guarda una factura anterior al contador

- **WHEN** se guarda una factura que se almacenó sin contador de revisión
- **THEN** el guardado se acepta y a partir de ahí la factura tiene contador

#### Scenario: Una factura anterior al contador también puede entrar en conflicto

- **WHEN** una factura sin contador se guarda desde otro sitio y después llega un guardado que
  seguía partiendo del estado sin contador
- **THEN** ese segundo guardado se rechaza sin escribir nada

### Requirement: El conflicto se comunica como una respuesta prevista, no como un fallo

El resultado de guardar DEBE (MUST) distinguir «guardado» de «rechazado por conflicto» mediante
un dato explícito de la respuesta. NO DEBE (MUST NOT) exigir que quien la recibe deduzca el
conflicto a partir del texto de un mensaje de error.

Un conflicto es la contestación normal a una pregunta legítima —«¿puedo escribir sobre esta
revisión?»—, no una avería. Deducirlo del texto ata el comportamiento a una redacción concreta:
cambiar o traducir el mensaje rompe la detección sin que falle ninguna prueba.

La respuesta de un conflicto DEBE incluir la revisión almacenada, para que quien la recibe pueda
decir sobre qué punto tendría que rehacer su trabajo.

#### Scenario: Se distingue sin leer el mensaje

- **WHEN** un guardado se rechaza por conflicto
- **THEN** la respuesta lo declara explícitamente, sin que haya que interpretar ningún texto

#### Scenario: El conflicto no se confunde con un guardado correcto

- **WHEN** un guardado se rechaza por conflicto
- **THEN** la respuesta no puede confundirse con la de un guardado que sí ocurrió

#### Scenario: La respuesta dice por dónde va la factura

- **WHEN** un guardado se rechaza por conflicto
- **THEN** la respuesta incluye la revisión que está almacenada

### Requirement: Ante un conflicto no se toca lo que la persona tiene escrito

Cuando un guardado se rechaza por conflicto, el editor DEBE (MUST) avisar de forma visible y
DEBE conservar intacto lo que haya en el formulario. NO DEBE (MUST NOT) recargar la factura,
descartar los cambios ni sobrescribir ningún campo por su cuenta.

Recargar para «traer lo último» parece servicial y es justo lo que destruye el trabajo: quien
lleva diez minutos escribiendo los pierde para ver los cambios de otro. Quien decide qué
conservar es quien está delante.

#### Scenario: El aviso aparece y el formulario sigue igual

- **WHEN** un guardado se rechaza por conflicto
- **THEN** se avisa de que otro guardado se adelantó y todo lo escrito sigue en su sitio

#### Scenario: Se puede volver a intentar

- **WHEN** tras el aviso se vuelve a guardar partiendo de la revisión ya almacenada
- **THEN** el guardado se acepta
