## MODIFIED Requirements

### Requirement: Una factura guarda datos, nunca un papel

Una factura DEBE (MUST) guardar el identificador de la plantilla con la que se pinta por defecto,
los datos de la factura, la lista de sus líneas y los parámetros del embed. NO DEBE (MUST NOT)
guardar el HTML renderizado, ningún PDF, ninguna imagen del documento ni una copia del diseño.

Junto a esos datos, una factura DEBE guardar un **contador de revisión**: un entero que sube en
cada guardado y que solo existe para detectar escrituras que se pisan. NO DEBE (MUST NOT)
guardar las revisiones anteriores: es un contador, no un historial.

El papel se vuelve a pintar en cada visita a partir de los datos guardados y de la plantilla **en el
estado en que esté en ese momento**. Es lo que permite retocar un diseño y que las facturas ya
emitidas salgan con el retoque.

Guardar una factura DEBE validar que los datos obligatorios que declara su plantilla están
presentes, con el mismo criterio que usa el render.

#### Scenario: Lo que se guarda

- **WHEN** se guarda una factura
- **THEN** quedan almacenados la plantilla, los datos, las líneas, los parámetros y el contador
  de revisión, y nada más

#### Scenario: No se guarda el historial

- **WHEN** se guarda una factura varias veces seguidas
- **THEN** solo queda almacenado el último estado, y del contador solo su valor actual

#### Scenario: Retocar el diseño alcanza a las facturas viejas

- **WHEN** se guarda una factura, se cambia después un color de la plantilla y se vuelve a abrir
- **THEN** la factura se pinta con el color nuevo, sin haber tocado sus datos

#### Scenario: Una factura sin sus datos obligatorios no se guarda

- **WHEN** se intenta guardar una factura a la que le falta un dato que su plantilla declara
  obligatorio
- **THEN** el guardado falla nombrando los caminos que faltan y no queda nada almacenado

## ADDED Requirements

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
