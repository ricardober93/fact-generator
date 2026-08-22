## ADDED Requirements

### Requirement: Un documento tiene estado y solo se emite una vez

Un documento DEBE (MUST) guardar su estado, que es `borrador` o `emitida`, y su tipo, que es
`factura` o `notaCredito`. Un documento guardado sin estado o sin tipo DEBE leerse como borrador
y como factura respectivamente, sin migración ni paso previo.

Emitir DEBE ser una transición explícita, distinta de guardar. Emitir un documento que ya está
emitido DEBE devolver ese mismo documento sin consumir otro consecutivo y sin cambiar nada.

No hace falta ninguna clave de idempotencia: emitir es siempre «emite este borrador», así que el
propio borrador es la clave. Es lo que hace inofensivos el doble clic, el reenvío del formulario
y el reintento de red.

#### Scenario: Un borrador nace borrador

- **WHEN** se crea una factura
- **THEN** su estado es borrador, no tiene número y no tiene instante de emisión

#### Scenario: Emitir cambia el estado

- **WHEN** se emite un borrador
- **THEN** su estado pasa a emitida y queda guardado su instante de emisión

#### Scenario: Emitir dos veces no emite dos veces

- **WHEN** se emite dos veces seguidas el mismo borrador
- **THEN** la segunda devuelve el documento ya emitido, con el mismo número, sin consumir otro
  consecutivo

#### Scenario: Un documento guardado antes de existir el estado

- **WHEN** se abre un documento almacenado sin estado ni tipo
- **THEN** se lee como borrador de tipo factura y se puede guardar y emitir sin ningún paso previo

### Requirement: Lo emitido no se vuelve a escribir

Guardar un documento emitido NO DEBE (MUST NOT) escribir absolutamente nada: ni los datos, ni las
líneas, ni los parámetros, ni la plantilla, ni el contador de revisión. El rechazo DEBE ocurrir en
el repositorio, que es por donde pasan la acción del editor, cualquier island y cualquier llamador
futuro.

Que el formulario se pinte en solo lectura es una cortesía para quien mira; la garantía es el
rechazo del repositorio.

#### Scenario: Guardar sobre un emitido no cambia nada

- **WHEN** se intenta guardar un documento emitido con datos distintos
- **THEN** el guardado se rechaza y el documento conserva exactamente los datos con los que se
  emitió

#### Scenario: El rechazo no depende de la interfaz

- **WHEN** se llama al repositorio directamente para guardar sobre un documento emitido
- **THEN** el rechazo ocurre igual

#### Scenario: El borrador sigue guardándose como siempre

- **WHEN** se guarda un borrador indicando su revisión almacenada
- **THEN** se guarda y el contador sube, igual que antes de existir la emisión

### Requirement: El formulario de un documento emitido es de solo lectura

La página de un documento emitido DEBE (MUST) mostrar sus campos y sus líneas sin permitir
editarlos, y NO DEBE ofrecer la acción de guardar.

#### Scenario: No se puede escribir en un emitido

- **WHEN** se abre un documento emitido
- **THEN** los campos y las líneas se ven pero no se pueden editar, y no hay acción de guardar

#### Scenario: El borrador se sigue editando

- **WHEN** se abre un borrador
- **THEN** los campos y las líneas se editan y la acción de guardar está disponible

### Requirement: Emitir exige que la aritmética cuadre

Emitir DEBE (MUST) comprobar, sobre los datos que el documento lleva, que el importe de cada línea
corresponde a su cantidad por su precio, que la suma de los importes de las líneas corresponde a la
base, y que la base más los impuestos corresponde al total. Si alguna comprobación falla, la
emisión DEBE rechazarse y NO DEBE consumirse ningún consecutivo.

Solo se comprueba lo que el documento lleva: una ruta ausente no se inventa. La única excepción son
los impuestos, que se tratan como cero cuando no están, porque un documento sin impuestos
declarados es un caso normal.

Esto no decide tarifas ni retenciones. Comprueba que lo que se va a entregar a un cliente no se
contradice a sí mismo, algo que en un borrador está permitido y en un documento emitido no.

#### Scenario: Una línea que no cuadra impide emitir

- **WHEN** se emite un documento con una línea de cantidad 3, precio 25,00 e importe 70,00
- **THEN** la emisión se rechaza nombrando la línea y no se consume ningún consecutivo

#### Scenario: Un total que no cuadra impide emitir

- **WHEN** se emite un documento cuya base más impuestos no da su total
- **THEN** la emisión se rechaza y el documento sigue siendo borrador

#### Scenario: Sin impuestos declarados se emite igual

- **WHEN** se emite un documento cuyos datos no incluyen impuestos y cuyo total coincide con su base
- **THEN** la emisión se acepta

#### Scenario: Lo que no está no se comprueba

- **WHEN** se emite un documento cuyos datos no incluyen base ni total
- **THEN** no se comprueba ninguna suma y la emisión se acepta

#### Scenario: En borrador la aritmética sigue siendo libre

- **WHEN** se guarda —sin emitir— un borrador cuyos totales no cuadran con sus líneas
- **THEN** se guarda tal y como se envió

### Requirement: Emitir congela el número dentro de los datos

Al emitir, el número asignado DEBE (MUST) quedar escrito tanto como campo del documento como
dentro de sus datos, en la ruta de número que las plantillas ya tienen enlazada. Si esa ruta traía
un valor escrito a mano, DEBE quedar sobrescrita.

El campo es lo que se consulta —unicidad, listado, búsqueda—; la ruta de los datos es lo que se
pinta, porque el render es una función pura que solo recibe el documento y los datos. Los dos se
escriben en el mismo instante y el documento queda congelado en ese instante, así que no pueden
divergir.

#### Scenario: El número llega al papel sin tocar la plantilla

- **WHEN** se emite un documento y se pinta con una plantilla que enlaza la ruta de número
- **THEN** el papel muestra el número asignado

#### Scenario: El número asignado manda sobre el tecleado

- **WHEN** se emite un borrador que traía un número escrito a mano en sus datos
- **THEN** los datos congelados contienen el número asignado, no el que estaba escrito

### Requirement: Un documento emitido que ya no encaja con su plantilla no se imprime

Cuando los datos congelados de un documento emitido no cubran algún camino que su plantilla
declara obligatorio, la página DEBE (MUST) impedir la impresión y DEBE nombrar los caminos que
faltan. Los datos NO DEBEN (MUST NOT) modificarse ni borrarse por ese desajuste.

En un borrador el mismo desajuste sigue siendo solo un aviso: se está trabajando. Un papel
entregado a un cliente al que le falta un dato obligatorio es peor que un papel que no sale.

#### Scenario: Un emitido incompleto no se imprime

- **WHEN** se abre un documento emitido cuya plantilla actual pide un camino que sus datos no
  tienen
- **THEN** se nombran los caminos que faltan y no se puede imprimir

#### Scenario: El borrador solo avisa

- **WHEN** se abre un borrador con el mismo desajuste
- **THEN** se avisa y se puede seguir trabajando

#### Scenario: Los datos congelados no se tocan

- **WHEN** se produce ese bloqueo
- **THEN** los datos del documento emitido siguen siendo exactamente los que se congelaron
