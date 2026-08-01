# invoice-template-storage Specification

## Purpose

TBD - created by archiving change invoice-template-model. Update Purpose after archive.

## Requirements

### Requirement: Persistencia de la plantilla

Una plantilla DEBE (MUST) guardarse con su nombre y su documento completo. Al recuperarla, el
documento DEBE ser estructuralmente idéntico al que se guardó.

#### Scenario: Guardar y recuperar

- **WHEN** se crea una plantilla con un documento válido y se recupera por su id
- **THEN** el documento recuperado es estructuralmente idéntico al guardado

#### Scenario: Rechazo de documento inválido

- **WHEN** se intenta guardar una plantilla cuyo documento no pasa la validación
- **THEN** la escritura falla y no se persiste nada

#### Scenario: Plantilla inexistente

- **WHEN** se pide una plantilla con un id que no existe
- **THEN** la operación indica su ausencia sin lanzar un error de infraestructura

### Requirement: Bloqueo optimista por revisión

Una plantilla DEBE (MUST) llevar un campo `rev` entero que se incrementa en cada escritura
aceptada. Toda escritura DEBE indicar la `rev` sobre la que se hizo la edición, y DEBE ser
rechazada si esa `rev` no coincide con la almacenada.

Esto es obligatorio y no una mejora: el documento se guarda como un único blob JSON que se
reescribe entero, de modo que sin `rev` la última escritura pisaría la anterior en silencio.

#### Scenario: Escritura sobre la revisión actual

- **WHEN** se guarda una plantilla indicando la `rev` que está almacenada
- **THEN** la escritura se acepta y la `rev` almacenada queda incrementada en uno

#### Scenario: Dos editores sobre la misma plantilla

- **WHEN** dos editores cargan la plantilla en la `rev` 7, el primero guarda con éxito y el
  segundo intenta guardar también con `rev` 7
- **THEN** la segunda escritura se rechaza por conflicto y el documento del primero
  permanece intacto

#### Scenario: La revisión no se puede forzar

- **WHEN** una escritura intenta fijar `rev` a un valor arbitrario
- **THEN** el valor propuesto se ignora y la `rev` la asigna el repositorio

### Requirement: Los assets viven en su propia entidad

Una imagen DEBE (MUST) guardarse en la entidad `Asset`, nunca incrustada dentro del documento de
una plantilla. Un bloque de imagen y un token de tema referencian el asset por su id.

El motivo es medible: el adaptador PG no proyecta columnas, así que un listado de
plantillas trae el blob completo de cada fila. Con los logos dentro, listar plantillas
descargaría todas las imágenes.

#### Scenario: Listar plantillas no trae imágenes

- **WHEN** se listan todas las plantillas
- **THEN** ningún registro devuelto contiene bytes de imagen

#### Scenario: El documento solo guarda la referencia

- **WHEN** se inspecciona un documento que usa un logo
- **THEN** contiene el id del asset y no su contenido en base64

### Requirement: Los assets son inmutables y direccionados por contenido

Un asset DEBE (MUST) llevar el hash de su contenido y DEBE ser inmutable una vez creado.
Subir dos veces el mismo contenido DEBE devolver el mismo asset, con el mismo id, sin crear
una segunda fila.

El hash es un campo propio, no el id: el adaptador asigna el id en `create()`
(`@repository.js:129` sobrescribe cualquier id previo), de modo que el id lo sigue
gobernando el framework y la deduplicación se resuelve consultando por hash.

Con esto, un logo compartido por cuarenta plantillas es una sola fila, y no hace falta
recolección de basura ni borrado en cascada.

#### Scenario: Subida idempotente

- **WHEN** se sube dos veces la misma imagen
- **THEN** ambas operaciones devuelven el mismo id y existe una sola fila

#### Scenario: Un bloque borrado no rompe otras plantillas

- **WHEN** se elimina el bloque de imagen que referenciaba un asset y otra plantilla sigue
  referenciándolo
- **THEN** el asset permanece disponible para esa otra plantilla

### Requirement: Validación del asset en el servidor

El servidor DEBE (MUST) determinar el tipo de una imagen leyendo sus magic bytes, no el tipo
declarado por el cliente, y DEBE aceptar únicamente `image/png`, `image/jpeg`, `image/webp`
e `image/svg+xml`. DEBE aplicar además su propio límite de tamaño, aunque el cliente ya
haya normalizado la imagen.

#### Scenario: Tipo declarado que no corresponde al contenido

- **WHEN** se sube un contenido cuyos magic bytes son de un formato no admitido, declarado
  como `image/png`
- **THEN** la subida se rechaza por tipo no admitido

#### Scenario: Formato admitido reconocido por contenido

- **WHEN** se sube un PNG válido
- **THEN** la subida se acepta y el asset queda registrado como `image/png`

#### Scenario: Exceso de tamaño

- **WHEN** se sube una imagen que supera el límite del servidor
- **THEN** la subida se rechaza por tamaño y no se persiste nada

### Requirement: Los assets se sirven como data URI

Un asset DEBE (MUST) poder entregarse como data URI en base64, con su tipo declarado, listo para
usarse como `src` de una etiqueta `<img>`. Nunca DEBE entregarse como markup para inyectar
en el DOM.

Un SVG entregado como markup e inlineado ejecuta los scripts que lleve dentro; el mismo SVG
en el `src` de un `<img>`, no.

#### Scenario: Forma de la data URI

- **WHEN** se pide la representación de un asset PNG para renderizar
- **THEN** devuelve una cadena que empieza por `data:image/png;base64,`

#### Scenario: SVG con script

- **WHEN** se pide la representación de un asset SVG que contiene una etiqueta `script`
- **THEN** devuelve una data URI, apta solo para el `src` de un `<img>`, y nunca el markup
  del SVG
