## ADDED Requirements

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
(MUST NOT) reescribirlo en cada movimiento del puntero. Un gesto de arrastre o redimensión
produce exactamente una entrada de deshacer.

#### Scenario: Un gesto deja una sola entrada de deshacer

- **WHEN** se arrastra un bloque con un gesto que atraviesa muchas posiciones intermedias
- **THEN** el documento registra un único cambio y una única acción de deshacer lo devuelve a la
  posición previa al gesto

### Requirement: La paleta instancia los tipos del registro

La paleta DEBE (MUST) ofrecer los tipos que expone el registro de bloques, sin lista propia, e
insertar el bloque nuevo en la banda seleccionada con los valores por defecto que declara su
definición.

#### Scenario: La paleta refleja el registro

- **WHEN** se abre la paleta
- **THEN** ofrece exactamente los tipos que el registro declara disponibles

#### Scenario: El bloque nuevo nace con sus valores por defecto

- **WHEN** se inserta un bloque de un tipo en una banda
- **THEN** el bloque queda en esa banda con todas las propiedades de su schema rellenadas con
  los valores por defecto de su definición y un identificador propio

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
