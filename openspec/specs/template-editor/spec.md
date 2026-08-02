# template-editor Specification

## Purpose

La superficie de edición de plantillas: el lienzo que pinta el documento con el mismo motor
que el embed, la manipulación directa de sus bloques —arrastre, imán, selección múltiple,
teclado, zoom y capas—, el inspector derivado del schema de cada tipo, y el guardado con
bloqueo optimista. No cubre el modelo del documento ni cómo se pinta: eso es
`invoice-document-model` e `invoice-renderer`.

## Requirements

### Requirement: El lienzo pinta con el mismo render que el embed

El editor DEBE (MUST) pintar el documento en edición invocando la misma función `render()` que
sirve el embed, y NO DEBE (MUST NOT) contener una segunda implementación del montaje del
documento. Un cambio en el motor de render se ve en el editor sin tocar el editor.

#### Scenario: El lienzo emite el mismo marcado que el embed

- **WHEN** se pinta en el editor un documento y se pinta ese mismo documento con los mismos
  datos fuera del editor
- **THEN** el marcado del documento es idéntico en ambos, sin bloques, atributos ni envoltorios
  que solo existan en uno de los dos

#### Scenario: Un tipo de bloque nuevo aparece en el lienzo sin tocar el editor

- **WHEN** se registra un tipo de bloque nuevo y se coloca uno en una banda
- **THEN** el lienzo lo pinta con la función `render` que aporta su definición

### Requirement: El lienzo pinta con datos de muestra derivados del schema

El editor DEBE (MUST) derivar los datos del preview del `dataSchema` del propio documento,
produciendo un valor por cada ruta declarada según su tipo, y NO DEBE (MUST NOT) depender de un
fixture de datos fijo. La derivación es una función pura.

#### Scenario: Cada ruta declarada recibe un valor de su tipo

- **WHEN** se derivan datos de muestra de un documento cuyo `dataSchema` declara rutas de tipo
  `string`, `number`, `boolean` y `date`
- **THEN** cada ruta queda presente con un valor de su tipo

#### Scenario: El documento con rutas obligatorias se pinta sin error

- **WHEN** se pinta en el editor un documento cuyo `dataSchema` declara rutas obligatorias y no
  hay datos reales
- **THEN** el lienzo lo pinta con los valores de muestra, sin lanzar el error de datos ausentes

#### Scenario: La banda de detalle se edita como una sola fila

- **WHEN** se pinta un documento con bloques en la banda `detail`
- **THEN** el lienzo emite exactamente una instancia de la banda `detail`, alimentada por un
  único item de muestra

### Requirement: Geometría por arrastre en milímetros relativos a la banda

Arrastrar o redimensionar un bloque DEBE (MUST) escribir `xMm`, `yMm`, `widthMm` y `heightMm`
en milímetros relativos a la banda del bloque, nunca a la página. Los valores se ajustan a
milímetros enteros. Un bloque NO DEBE (MUST NOT) salir de su banda ni tomar ancho o alto
negativos.

#### Scenario: Un desplazamiento en pantalla se convierte en milímetros de la banda

- **WHEN** se arrastra un bloque de la banda `summary` una distancia equivalente a 10 mm hacia
  la derecha y 5 mm hacia abajo
- **THEN** su `xMm` aumenta en 10 y su `yMm` en 5, y ningún otro bloque ni banda cambia

#### Scenario: El arrastre se detiene en el borde de la banda

- **WHEN** se arrastra un bloque más allá del borde de su banda
- **THEN** el bloque queda contenido en la banda, con coordenadas dentro de su ancho y alto

#### Scenario: La redimensión no produce medidas negativas

- **WHEN** se redimensiona un bloque arrastrando su tirador por encima de su origen
- **THEN** su ancho y su alto se quedan en el mínimo admitido y nunca son negativos

### Requirement: La escala entre píxeles y milímetros se mide del lienzo

El editor DEBE (MUST) obtener la relación píxel–milímetro midiendo el nodo del documento ya
maquetado, y NO DEBE (MUST NOT) asumir la constante de 96 dpi de CSS. La medida se rehace cuando
el lienzo cambia de tamaño.

#### Scenario: El arrastre sigue siendo exacto con el lienzo a otra escala

- **WHEN** el lienzo se muestra a una escala distinta de 1 y se arrastra un bloque una distancia
  dada en píxeles
- **THEN** el desplazamiento en milímetros escrito en el bloque corresponde a esa distancia según
  la escala medida, no según la constante de CSS

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

### Requirement: El inspector se deriva del schema del bloque

El inspector DEBE (MUST) construir el panel de propiedades recorriendo el schema del tipo de
bloque y presentando un editor por cada tipo de propiedad declarado. Un tipo de bloque NO DEBE
(MUST NOT) tener que aportar un componente propio para que sus propiedades sean editables.

#### Scenario: Un tipo sin Inspector propio tiene panel de propiedades

- **WHEN** se selecciona un bloque cuya definición no aporta `Inspector`
- **THEN** el panel presenta un editor por cada propiedad de su schema, acorde al tipo declarado

#### Scenario: Editar una propiedad la escribe en el bloque seleccionado

- **WHEN** se cambia el valor de una propiedad en el panel
- **THEN** solo esa propiedad de ese bloque cambia en el documento y el lienzo lo refleja

#### Scenario: Una propiedad enumerada solo admite sus valores

- **WHEN** se edita una propiedad declarada como `enum:left,center,right`
- **THEN** el editor ofrece únicamente esos tres valores

### Requirement: Las propiedades de tema se editan como referencia a token

El editor de una propiedad de tipo `token` DEBE (MUST) ofrecer las claves del tema del documento
y escribir la referencia (`@clave`), y NO DEBE (MUST NOT) escribir nunca el valor literal del
tema en el bloque.

#### Scenario: Elegir un color escribe la referencia, no el color

- **WHEN** se elige el token de color primario para una propiedad `token` de un bloque
- **THEN** el bloque guarda la referencia `@primary` y no el valor de color al que resuelve

### Requirement: El texto se edita como estructura de fragmentos

El editor de una propiedad de tipo `text` DEBE (MUST) operar sobre los fragmentos literales y de
binding de la estructura de texto, y NO DEBE (MUST NOT) aceptar ni guardar HTML crudo.

#### Scenario: Un literal y un binding conviven en un mismo texto

- **WHEN** se compone un contenido con un fragmento literal y un fragmento enlazado a una ruta
- **THEN** el bloque guarda ambos como fragmentos de su tipo, con su ruta y su formato, y el
  lienzo pinta el literal y el valor de muestra de la ruta

#### Scenario: El marcado escrito por el usuario no se interpreta

- **WHEN** un fragmento literal contiene caracteres de marcado
- **THEN** se guardan y se pintan como texto, sin convertirse en elementos del documento

### Requirement: Enlazar una ruta nueva la declara en el schema de datos

Enlazar un fragmento a una ruta que el `dataSchema` no declara DEBE (MUST) añadirla al
`dataSchema` del documento como opcional. La declaración automática NO DEBE (MUST NOT) marcar la
ruta como obligatoria.

#### Scenario: La ruta nueva queda declarada y opcional

- **WHEN** se enlaza un fragmento a una ruta que no estaba en el `dataSchema`
- **THEN** el `dataSchema` la incluye y no está marcada como obligatoria

#### Scenario: Enlazar a una ruta ya declarada no la altera

- **WHEN** se enlaza un fragmento a una ruta que el `dataSchema` ya declara como obligatoria y de
  tipo numérico
- **THEN** la declaración de esa ruta permanece igual

### Requirement: El guardado respeta el bloqueo optimista y hace visible el conflicto

Guardar DEBE (MUST) enviar el documento junto a la revisión desde la que se editó. Si la
revisión almacenada ya no coincide, el servidor NO DEBE (MUST NOT) escribir, y el editor DEBE
(MUST) avisar conservando lo editado en pantalla.

#### Scenario: Un guardado limpio avanza la revisión

- **WHEN** se guarda un documento desde la revisión vigente
- **THEN** el documento queda almacenado y la revisión avanza

#### Scenario: Un guardado contra una revisión vieja no escribe

- **WHEN** se guarda desde una revisión anterior a la almacenada
- **THEN** el documento almacenado no cambia, la respuesta es un conflicto, y el editor sigue
  mostrando lo editado sin descartarlo

#### Scenario: Un documento inválido no se guarda

- **WHEN** se intenta guardar un documento que la validación rechaza
- **THEN** no se escribe nada y la respuesta nombra los problemas encontrados

### Requirement: Deshacer y rehacer sobre el documento

El editor DEBE (MUST) permitir deshacer y rehacer los cambios del documento. La pila DEBE (MUST)
estar acotada para no crecer sin límite durante una sesión larga.

#### Scenario: Deshacer devuelve el estado anterior

- **WHEN** se hacen tres cambios y se deshacen dos
- **THEN** el documento queda como estaba tras el primer cambio, y rehacer recupera el segundo

#### Scenario: Un cambio nuevo descarta lo rehacible

- **WHEN** se deshace un cambio y a continuación se hace uno distinto
- **THEN** ya no queda nada que rehacer

### Requirement: El editor no es una página estática

Las vistas del editor NO DEBEN (MUST NOT) declararse `static`, porque una vista estática se salta
los middlewares y el editor es una superficie de escritura.

#### Scenario: Ninguna vista del editor es estática

- **WHEN** se inspeccionan las vistas que declara el controlador del editor
- **THEN** ninguna declara generación estática

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

### Requirement: El tema del documento se edita en un panel propio

El editor DEBE (MUST) ofrecer un panel que liste todos los tokens declarados en el tema del
documento y permita cambiar su valor, sin necesidad de seleccionar antes un bloque que los
referencie. Un token de color DEBE editarse con un selector de color; los demás, con campo de
texto.

Cambiar un token DEBE repintar el lienzo sin tocar ningún bloque, y DEBE entrar en el historial
como una edición más.

El panel edita valores, no la lista de tokens: NO DEBE (MUST NOT) añadir ni borrar tokens. El
conjunto de tokens de un documento lo fija el diseño del que nace, y borrar uno referenciado
dejaría el documento sin validar.

#### Scenario: El panel lista el tema entero

- **WHEN** se abre el editor de una plantilla creada desde `bars-navy`
- **THEN** el panel de tema muestra un control por cada token del tema, con su valor actual

#### Scenario: Cambiar un color repinta el documento

- **WHEN** se cambia el valor del token `accent` en el panel
- **THEN** el lienzo repinta con el color nuevo y ningún bloque cambia

#### Scenario: El cambio de tema se deshace

- **WHEN** se cambia un token y se deshace
- **THEN** el token vuelve a su valor anterior

#### Scenario: El panel no altera la lista de tokens

- **WHEN** se usa el panel de tema
- **THEN** no ofrece añadir ni borrar tokens, y el documento conserva exactamente los que tenía

### Requirement: El alto de cada banda se edita desde el editor

El editor DEBE (MUST) ofrecer un control para cambiar el alto en milímetros de la banda
seleccionada. El alto DEBE ser un número positivo; un valor no positivo o no numérico se rechaza
sin modificar el documento.

Al reducir el alto de una banda, los bloques que quedarían fuera DEBEN reencuadrarse dentro de
ella, con el mismo criterio que ya se aplica al mover un bloque.

#### Scenario: Cambiar el alto de una banda

- **WHEN** se fija en 90 el alto de la banda `header`
- **THEN** la banda mide 90 mm en el lienzo y el documento lo refleja

#### Scenario: Reducir el alto reencuadra lo que sobresale

- **WHEN** se reduce el alto de una banda por debajo del borde inferior de uno de sus bloques
- **THEN** ese bloque queda dentro de la banda

#### Scenario: Alto inválido

- **WHEN** se intenta fijar un alto de 0 o un valor no numérico
- **THEN** el documento no cambia

### Requirement: Los bloques decorativos no estorban a la edición

Un bloque PUEDE marcarse como decorativo. Un bloque decorativo DEBE (MUST) pintarse exactamente
igual que cualquier otro —en el lienzo, en el embed y al imprimir—, pero NO DEBE (MUST NOT)
seleccionarse al hacer clic sobre él en el lienzo, y la lista de capas DEBE agruparlos en una
única entrada plegable por banda en vez de una fila por bloque.

Desplegando esa entrada, o mediante la selección por área, un bloque decorativo DEBE poder
seleccionarse y editarse como cualquier otro. La marca es una ayuda de edición, no un bloqueo.

Un documento sin ninguna marca de decoración DEBE comportarse exactamente como hasta ahora.

#### Scenario: La decoración se agrupa en la lista de capas

- **WHEN** se selecciona la cabecera de una plantilla creada desde `mosaic-red`, con 66 cajas
  decorativas
- **THEN** la lista de capas muestra una sola entrada plegable para la decoración, y una fila por
  cada bloque no decorativo

#### Scenario: Un clic en el lienzo no selecciona decoración

- **WHEN** se hace clic sobre un bloque decorativo en el lienzo
- **THEN** la selección no cambia a ese bloque

#### Scenario: La decoración se puede editar cuando se busca

- **WHEN** se despliega la entrada de decoración y se elige uno de sus bloques
- **THEN** ese bloque queda seleccionado y su inspector permite editarlo

#### Scenario: La decoración se pinta igual

- **WHEN** se renderiza un documento con bloques decorativos
- **THEN** el marcado resultante es el mismo que si no estuvieran marcados

### Requirement: El editor aplica un diseño del catálogo al documento abierto

El editor DEBE (MUST) ofrecer aplicar un diseño del catálogo a la plantilla abierta, pidiendo
confirmación porque sustituye el documento entero, y registrando la sustitución en el historial
para que se pueda deshacer.

Tras aplicar un diseño, el documento resultante DEBE ser válido: es el que construye el diseño, sin
mezcla con el anterior.

#### Scenario: Aplicar un diseño desde el editor

- **WHEN** se elige un diseño del catálogo en el editor y se confirma
- **THEN** el documento del editor pasa a ser el de ese diseño y la validación lo acepta

#### Scenario: La sustitución es una edición más

- **WHEN** se aplica un diseño y se pulsa deshacer
- **THEN** vuelve el documento anterior completo
