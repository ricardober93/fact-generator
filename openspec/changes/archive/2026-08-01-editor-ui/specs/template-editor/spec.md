## ADDED Requirements

### Requirement: El sistema de diseño se sirve desde el proyecto

La presentación del editor DEBE (MUST) apoyarse en el sistema de diseño del proyecto, servido
desde el propio repositorio. El editor NO DEBE (MUST NOT) pedir hojas de estilo, fuentes ni
iconos a un servidor externo en tiempo de ejecución, ni depender de la red para arrancar.

#### Scenario: La página no pide recursos de estilo a terceros

- **WHEN** se sirve una vista del editor
- **THEN** su documento no referencia ninguna hoja de estilo, fuente ni icono alojado fuera del
  proyecto

#### Scenario: El editor arranca sin red

- **WHEN** se arranca la aplicación sin acceso a la red
- **THEN** las vistas del editor se sirven con su presentación completa

### Requirement: El documento se ve igual en el editor que en el embed

Los estilos de la aplicación NO DEBEN (MUST NOT) alterar cómo se pinta el documento dentro del
lienzo. El mismo documento, con los mismos datos, DEBE (MUST) resolverse a los mismos estilos
computados en el editor y en el embed.

#### Scenario: Los estilos computados del documento coinciden en ambas superficies

- **WHEN** se pinta un mismo documento con los mismos datos en el lienzo del editor y en el embed
- **THEN** los nodos correspondientes del documento resuelven a la misma tipografía, color,
  tamaño y geometría en las dos superficies

#### Scenario: Una regla de la aplicación no alcanza al documento

- **WHEN** el sistema de diseño impone un estilo a un elemento desnudo que el documento también
  emite, como una tabla o una imagen
- **THEN** el documento conserva el suyo

### Requirement: El embed no lleva estilos de aplicación

La vista del embed NO DEBE (MUST NOT) incluir el sistema de diseño ni ninguna hoja de estilo de la
aplicación. Sigue sirviendo un documento autocontenido.

#### Scenario: El embed sigue siendo autocontenido

- **WHEN** se sirve un embed
- **THEN** su documento no contiene el sistema de diseño, y los únicos estilos presentes son los
  que emite el motor de render

### Requirement: La presentación del chrome sale de los tokens del sistema

El color, la tipografía, el espaciado y los radios del chrome del editor DEBEN (MUST) tomarse de
los tokens del sistema de diseño. NO DEBEN (MUST NOT) escribirse como valores sueltos en estilos
en línea.

Se exceptúan las posiciones calculadas en tiempo de ejecución de la capa de selección, que son
medidas en píxeles y no se pueden expresar como clase.

#### Scenario: El chrome no lleva colores ni medidas sueltas

- **WHEN** se inspecciona el marcado del chrome del editor
- **THEN** ningún elemento declara en línea un color, una familia tipográfica, un tamaño de letra
  ni un espaciado literal

#### Scenario: La capa de selección conserva su geometría calculada

- **WHEN** hay un bloque seleccionado
- **THEN** el recuadro de selección se posiciona con las medidas en píxeles calculadas del lienzo

### Requirement: El editor es operable con el teclado y sus campos están etiquetados

Todo control del editor DEBE (MUST) mostrar un indicador de foco visible al recibirlo con el
teclado. Todo campo del inspector DEBE (MUST) tener una etiqueta asociada, y todo botón cuyo
contenido sea un icono DEBE (MUST) exponer un nombre accesible.

#### Scenario: El foco de teclado se ve

- **WHEN** se recorre el editor con el tabulador
- **THEN** el control enfocado muestra un indicador de foco visible

#### Scenario: Cada campo del inspector tiene su etiqueta

- **WHEN** se selecciona un bloque
- **THEN** cada campo del panel de propiedades está asociado a una etiqueta que lo nombra

#### Scenario: Un botón de icono se puede nombrar

- **WHEN** se inspecciona un botón cuyo contenido es únicamente un icono
- **THEN** expone un nombre accesible que describe su acción

### Requirement: La iconografía no usa caracteres de texto

Un icono DEBE (MUST) emitirse como gráfico vectorial. El editor NO DEBE (MUST NOT) usar emoji ni
caracteres unicode decorativos como iconos.

#### Scenario: Reordenar y borrar fragmentos usa iconos, no glifos

- **WHEN** se inspeccionan los controles de reordenar y borrar un fragmento de texto
- **THEN** su contenido es un gráfico vectorial y no un carácter de texto

### Requirement: La disposición del editor se adapta al ancho disponible

La disposición del editor DEBE (MUST) seguir siendo utilizable en una ventana estrecha: ningún
panel puede quedar recortado ni empujar al documento fuera de la vista.

#### Scenario: En una ventana estrecha no se recorta ningún panel

- **WHEN** se reduce el ancho de la ventana por debajo del ancho de las tres columnas
- **THEN** los paneles se reorganizan y siguen siendo alcanzables, sin recortarse ni desbordar
  horizontalmente la página
