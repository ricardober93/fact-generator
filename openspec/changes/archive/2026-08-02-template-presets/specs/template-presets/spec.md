## ADDED Requirements

### Requirement: El catálogo declara sus diseños en código

Un diseño de partida DEBE (MUST) declararse en un único archivo del proyecto, aportando su
identificador estable, su nombre visible, una descripción corta, la familia a la que pertenece y
la función que construye su documento. El catálogo DEBE exponer la lista completa y la resolución
de un identificador a su entrada.

Un identificador NO DEBE (MUST NOT) repetirse. El identificador es lo que viaja en el formulario y
lo que queda escrito en el historial de la plantilla; cambiarlo rompe enlaces, así que se trata
como estable.

El catálogo NO DEBE (MUST NOT) vivir en la base de datos. Añadir un diseño es añadir un archivo y
una entrada en la lista, nunca administrar registros.

#### Scenario: Los identificadores son únicos

- **WHEN** se recorre el catálogo
- **THEN** ningún identificador aparece dos veces

#### Scenario: Resolver un identificador conocido

- **WHEN** se pide el diseño `chevron-slate`
- **THEN** el catálogo devuelve su entrada, con nombre, descripción y familia

#### Scenario: Resolver un identificador desconocido

- **WHEN** se pide un diseño que no está en el catálogo
- **THEN** el catálogo devuelve nulo y no lanza

#### Scenario: Cada diseño se anuncia con lo que hace falta para elegirlo

- **WHEN** se recorre el catálogo
- **THEN** toda entrada tiene nombre visible y descripción no vacíos, y una familia declarada

### Requirement: Todo diseño produce un documento válido y autosuficiente

Un diseño DEBE (MUST) construir un documento que la validación del modelo acepte sin errores. El
documento DEBE ser autosuficiente: declarar en su schema de datos toda ruta que sus bloques
enlazan, y en su tema todo token que sus bloques referencian.

Construir el mismo diseño dos veces DEBE producir documentos equivalentes: los diseños no dependen
de la hora, del azar sin semilla ni de ningún estado externo.

#### Scenario: El documento de un diseño valida

- **WHEN** se construye cualquier diseño del catálogo y se valida
- **THEN** la validación no devuelve ningún error

#### Scenario: El diseño se pinta con los datos de muestra de su propio schema

- **WHEN** se derivan datos de muestra del schema de un diseño y se renderiza con ellos
- **THEN** el render produce marcado y no queda ningún enlace sin resolver

#### Scenario: Construir dos veces da lo mismo

- **WHEN** se construye el mismo diseño dos veces
- **THEN** ambos documentos son iguales

#### Scenario: El diseño aprovecha el ancho de su página

- **WHEN** se construye cualquier diseño del catálogo
- **THEN** ningún bloque sobresale del ancho útil de la página, y el bloque más a la derecha llega
  al menos al 90 % de ese ancho

### Requirement: Todo diseño expone su color como parámetro del embed

Un diseño DEBE (MUST) declarar entre los parámetros de su documento uno llamado `color` apuntando a
un token declarado en su tema. Es lo que permite que dos variantes del mismo diseño —pizarra y
ámbar, rojo y verde— sean el mismo documento repintado desde la URL del embed.

#### Scenario: El parámetro de color existe y apunta a un token declarado

- **WHEN** se construye cualquier diseño del catálogo
- **THEN** sus parámetros incluyen `color` y el token al que apunta está declarado en el tema

### Requirement: La galería previsualiza cada diseño con el motor de render

El alta de una plantilla DEBE (MUST) mostrar el catálogo como galería, y cada entrada DEBE
acompañarse de una previsualización del documento generada con la misma función `render` que pinta
el lienzo y el embed, alimentada con los datos de muestra del propio diseño.

La previsualización NO DEBE (MUST NOT) ser una imagen almacenada ni una captura de pantalla: un
retoque en un diseño tiene que verse en su tarjeta sin regenerar ningún recurso.

La galería DEBE ofrecer además la opción de empezar en blanco.

#### Scenario: Cada diseño se ve antes de elegirlo

- **WHEN** se abre el alta de plantilla
- **THEN** aparece una tarjeta por diseño del catálogo, cada una con su nombre, su descripción y
  una previsualización del documento

#### Scenario: La previsualización sale del render, no de una imagen

- **WHEN** se cambia una propiedad de un bloque de un diseño y se vuelve a abrir el alta
- **THEN** la tarjeta de ese diseño refleja el cambio sin haber regenerado ningún recurso

#### Scenario: Empezar en blanco sigue estando

- **WHEN** se abre el alta de plantilla
- **THEN** además de los diseños se ofrece crear una plantilla vacía

### Requirement: Crear desde un diseño guarda ese documento

Crear una plantilla indicando un diseño DEBE (MUST) guardar exactamente el documento que ese diseño
construye. Indicar un diseño desconocido DEBE fallar con error de petición inválida y NO DEBE
(MUST NOT) crear ninguna plantilla. No indicar diseño DEBE crear una plantilla en blanco.

#### Scenario: Alta con diseño

- **WHEN** se crea una plantilla indicando `mosaic-red`
- **THEN** la plantilla guardada tiene el documento que construye ese diseño

#### Scenario: Alta con diseño desconocido

- **WHEN** se crea una plantilla indicando un diseño que no existe
- **THEN** la petición falla con código 400 y no queda ninguna plantilla guardada

#### Scenario: Alta sin diseño

- **WHEN** se crea una plantilla sin indicar diseño
- **THEN** la plantilla guardada tiene el documento vacío

### Requirement: Un diseño se puede aplicar a una plantilla existente

El editor DEBE (MUST) permitir aplicar un diseño del catálogo al documento abierto. Aplicarlo
reemplaza el documento entero —bandas, bloques, tema, schema y parámetros—, así que DEBE pedir
confirmación explícita antes de hacerlo.

La sustitución DEBE entrar en el historial como una edición más: deshacer devuelve el documento
anterior. NO DEBE (MUST NOT) guardarse sola: hasta que se guarde, la plantilla almacenada conserva
su documento y su revisión.

#### Scenario: Aplicar un diseño sustituye el documento

- **WHEN** se aplica `bars-navy` a una plantilla abierta y se confirma
- **THEN** el documento del editor pasa a ser el que construye ese diseño

#### Scenario: Aplicar un diseño se deshace

- **WHEN** se aplica un diseño y luego se deshace
- **THEN** vuelve el documento que había antes, con sus bloques y su tema

#### Scenario: Sin confirmar no se sustituye nada

- **WHEN** se pide aplicar un diseño y se cancela la confirmación
- **THEN** el documento del editor no cambia

#### Scenario: Aplicar no guarda

- **WHEN** se aplica un diseño y no se guarda
- **THEN** la plantilla almacenada conserva su documento y su revisión anteriores
