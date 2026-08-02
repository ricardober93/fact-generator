## ADDED Requirements

### Requirement: Insertar un bloque arrastrándolo al lienzo

El editor DEBE (MUST) permitir insertar un tipo de bloque arrastrándolo desde la paleta hasta el
lienzo. La banda de destino es aquella sobre la que se suelta y el bloque nace con su origen en el
punto de soltado, ajustado a los límites de esa banda. Soltar fuera de una banda NO DEBE (MUST
NOT) crear ningún bloque.

#### Scenario: Soltar sobre una banda crea el bloque en ese punto

- **WHEN** se arrastra un tipo desde la paleta y se suelta dentro de la banda `summary`
- **THEN** el documento gana un bloque de ese tipo en `summary`, con `xMm` e `yMm`
  correspondientes al punto de soltado, y las demás bandas no cambian

#### Scenario: Soltar fuera de una banda no crea nada

- **WHEN** se arrastra un tipo desde la paleta y se suelta fuera del lienzo
- **THEN** el documento no cambia

### Requirement: Imán y guías de alineación durante el gesto

Al mover o redimensionar, el editor DEBE (MUST) enganchar cada eje por separado al candidato más
cercano dentro de un umbral medido en píxeles de pantalla, y DEBE dibujar la guía mientras el
enganche está activo y retirarla al terminar el gesto. Son candidatos los bordes y el centro de
los demás bloques de la misma banda y los bordes y el centro de la propia banda. El imán NO DEBE
(MUST NOT) sacar un bloque de su banda, y DEBE poder desactivarse con una tecla modificadora.

#### Scenario: Un borde cercano al de un vecino se pega a él

- **WHEN** se arrastra un bloque hasta dejar su borde izquierdo a menos del umbral del borde
  izquierdo de otro bloque de la misma banda
- **THEN** ambos bordes quedan en la misma coordenada y se dibuja la guía correspondiente

#### Scenario: Con el modificador no hay imán

- **WHEN** se arrastra un bloque con la tecla modificadora pulsada junto a un candidato dentro
  del umbral
- **THEN** el bloque queda en la posición del gesto, sin engancharse y sin guía

### Requirement: Selección múltiple dentro de una banda

El editor DEBE (MUST) permitir seleccionar varios bloques de una misma banda, con clic más tecla
modificadora y con un marco de selección. La selección NO DEBE (MUST NOT) contener bloques de
bandas distintas: seleccionar en otra banda reemplaza la selección. Mover una selección DEBE
conservar las distancias entre sus bloques.

#### Scenario: El marco selecciona los bloques que contiene

- **WHEN** se arrastra un marco sobre una zona vacía de una banda que abarca dos de sus tres
  bloques
- **THEN** quedan seleccionados esos dos y el tercero no

#### Scenario: La tecla modificadora añade y quita

- **WHEN** se hace clic con la tecla modificadora sobre un bloque no seleccionado y después
  sobre uno ya seleccionado
- **THEN** el primero entra en la selección y el segundo sale

#### Scenario: Seleccionar en otra banda reemplaza la selección

- **WHEN** hay bloques seleccionados en `header` y se selecciona un bloque de `detail`
- **THEN** la selección pasa a contener únicamente el bloque de `detail`

#### Scenario: El conjunto se mueve manteniendo su forma

- **WHEN** se arrastran dos bloques seleccionados hasta el borde de la banda
- **THEN** ambos se desplazan lo mismo, la distancia entre ellos no cambia y ninguno sale de la
  banda

### Requirement: Alinear y distribuir la selección

Con dos o más bloques seleccionados, el editor DEBE (MUST) ofrecer alinear por izquierda, centro,
derecha, arriba, medio y abajo respecto al rectángulo que envuelve la selección. Con tres o más
DEBE ofrecer distribuir el espacio en horizontal y en vertical. Estas operaciones NO DEBEN (MUST
NOT) cambiar el tamaño de ningún bloque, y cada una deja una sola entrada de deshacer.

#### Scenario: Alinear a la izquierda iguala la coordenada horizontal

- **WHEN** se alinean a la izquierda tres bloques seleccionados
- **THEN** los tres comparten el `xMm` del más a la izquierda y ninguno cambia de tamaño

#### Scenario: Distribuir reparte el espacio libre

- **WHEN** se distribuyen en horizontal tres bloques seleccionados
- **THEN** los extremos no se mueven y los huecos entre bloques consecutivos quedan iguales

#### Scenario: Sin selección suficiente no ocurre nada

- **WHEN** se pide alinear con un solo bloque seleccionado
- **THEN** el documento no cambia

### Requirement: Teclado para mover, duplicar y pegar

El editor DEBE (MUST) mover la selección con las flechas —un milímetro por pulsación, diez con la
tecla `Shift`—, duplicarla con su atajo, copiar y pegar dentro del mismo documento, y limpiar la
selección con `Escape`. Duplicar y pegar DEBEN crear bloques con identificadores nuevos, sin
alterar los originales. Ningún atajo DEBE actuar mientras el foco está en un campo de edición.

#### Scenario: La flecha mueve un milímetro y con Shift diez

- **WHEN** se pulsa la flecha derecha y después la flecha derecha con `Shift`
- **THEN** el bloque seleccionado avanza primero 1 mm y después 10 mm, sin salir de la banda

#### Scenario: Cada pulsación deja su entrada de deshacer

- **WHEN** se pulsa tres veces una flecha
- **THEN** hacen falta tres acciones de deshacer para volver a la posición inicial

#### Scenario: Duplicar y pegar crean bloques nuevos

- **WHEN** se duplica una selección de dos bloques y después se pega un bloque copiado
- **THEN** los bloques nuevos tienen las mismas propiedades, identificadores distintos de los
  originales y una posición desplazada, y los originales no cambian

#### Scenario: Escribiendo en un campo los atajos no actúan

- **WHEN** se pulsan flechas con el foco en un campo del inspector
- **THEN** el documento no cambia

### Requirement: Redimensión desde los ocho tiradores

La selección de un único bloque DEBE (MUST) ofrecer ocho tiradores —cuatro esquinas y cuatro
lados—. Cada tirador mueve solo los bordes que le corresponden y DEBE dejar fijo el borde
opuesto. El resultado respeta el tamaño mínimo, los límites de la banda y el imán.

#### Scenario: Un tirador de esquina deja fijo el borde opuesto

- **WHEN** se arrastra el tirador superior izquierdo de un bloque
- **THEN** su origen y su tamaño cambian, y su borde inferior derecho queda donde estaba

#### Scenario: Un tirador de lado cambia un solo eje

- **WHEN** se arrastra el tirador del lado derecho
- **THEN** solo cambia el ancho, y `yMm` y el alto se conservan

### Requirement: La geometría se lee durante el gesto y se escribe con precisión

El editor DEBE (MUST) mostrar la geometría en milímetros mientras dura un gesto, y DEBE ofrecer
en el inspector campos numéricos de `xMm`, `yMm`, `widthMm` y `heightMm` del bloque seleccionado.
Escribir un campo tiene el mismo efecto que el gesto equivalente: se ajusta a la banda y deja una
sola entrada de deshacer. Un valor no numérico NO DEBE (MUST NOT) alterar el documento.

#### Scenario: Escribir una coordenada mueve el bloque

- **WHEN** se escribe `20` en el campo `xMm` de un bloque
- **THEN** el bloque queda en `xMm` 20, dentro de su banda, y el lienzo lo refleja

#### Scenario: Un valor no numérico no cambia nada

- **WHEN** se escribe texto en un campo de geometría
- **THEN** el documento no cambia

### Requirement: El zoom es de pantalla y no toca el documento

El editor DEBE (MUST) ofrecer acercar, alejar, tamaño real y encaje al ancho disponible. El zoom
NO DEBE (MUST NOT) modificar ningún valor del documento ni el tamaño de página.

#### Scenario: Cambiar el zoom no cambia el documento

- **WHEN** se acerca y se aleja el lienzo
- **THEN** el documento es idéntico al de antes de tocar el zoom, y el arrastre sigue escribiendo
  la distancia correcta en milímetros

### Requirement: Lista de capas de la banda

El editor DEBE (MUST) presentar los bloques de una banda como lista en orden de pintado.
Seleccionar en la lista DEBE seleccionar en el lienzo y al revés. Reordenar en la lista DEBE
cambiar qué bloque queda encima en el documento.

#### Scenario: Un bloque tapado se selecciona desde la lista

- **WHEN** un bloque queda completamente cubierto por otro y se elige en la lista
- **THEN** queda seleccionado y el lienzo muestra su selección

#### Scenario: Reordenar cambia quién queda encima

- **WHEN** se sube un bloque en la lista por encima del que lo tapaba
- **THEN** el documento pinta ese bloque después del otro

### Requirement: El inspector edita listas de celdas

El editor de una propiedad de tipo `cells` DEBE (MUST) permitir añadir, borrar y reordenar celdas,
y editar de cada una su etiqueta, su ruta enlazada, su formato, su ancho en milímetros y su
alineación. La etiqueta es texto literal: NO DEBE (MUST NOT) interpretarse como marcado. Enlazar
una celda a una ruta que el `dataSchema` no declara la añade como opcional.

#### Scenario: Añadir una celda la crea con valores por defecto

- **WHEN** se añade una celda a un bloque con propiedad `cells`
- **THEN** la lista gana una celda al final con sus valores por defecto y las demás no cambian

#### Scenario: Reordenar cambia el orden de las celdas

- **WHEN** se mueve la tercera celda a la primera posición
- **THEN** el bloque guarda ese orden y el lienzo lo refleja

#### Scenario: Enlazar una ruta nueva la declara opcional

- **WHEN** se enlaza una celda a una ruta que el `dataSchema` no declara
- **THEN** el `dataSchema` la incluye y no queda marcada como obligatoria

## MODIFIED Requirements

### Requirement: La paleta instancia los tipos del registro

La paleta DEBE (MUST) ofrecer los tipos que expone el registro de bloques, sin lista propia,
filtrados por las bandas que cada definición admite, e insertar el bloque nuevo con los valores
por defecto que declara su definición. La inserción por arrastre convive con la inserción por
activación —clic o teclado—, que coloca el bloque en la banda activa: el editor NO DEBE (MUST
NOT) exigir un puntero para insertar.

#### Scenario: La paleta refleja el registro

- **WHEN** se abre la paleta
- **THEN** ofrece exactamente los tipos que el registro declara disponibles para la banda de
  destino

#### Scenario: Un tipo restringido no se ofrece en otra banda

- **WHEN** la banda de destino es `pageFooter` y un tipo declara admitirse solo en `detail`
- **THEN** la paleta no ofrece ese tipo

#### Scenario: El bloque nuevo nace con sus valores por defecto

- **WHEN** se inserta un bloque de un tipo en una banda
- **THEN** el bloque queda en esa banda con todas las propiedades de su schema rellenadas con
  los valores por defecto de su definición y un identificador propio

#### Scenario: Se puede insertar sin ratón

- **WHEN** hay una banda activa y se activa un tipo de la paleta con el teclado
- **THEN** el bloque se inserta en esa banda y queda seleccionado

### Requirement: El documento se actualiza al soltar

El editor DEBE (MUST) escribir el documento una sola vez al terminar el gesto, y NO DEBE
(MUST NOT) reescribirlo en cada movimiento del puntero. Un gesto de arrastre, redimensión o
inserción produce exactamente una entrada de deshacer, tenga la selección un bloque o varios.

#### Scenario: Un gesto deja una sola entrada de deshacer

- **WHEN** se arrastra un bloque con un gesto que atraviesa muchas posiciones intermedias
- **THEN** el documento registra un único cambio y una única acción de deshacer lo devuelve a la
  posición previa al gesto

#### Scenario: Mover varios bloques deja una sola entrada de deshacer

- **WHEN** se arrastra una selección de tres bloques
- **THEN** una única acción de deshacer devuelve los tres a su posición previa al gesto
