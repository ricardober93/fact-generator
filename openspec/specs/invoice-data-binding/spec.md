# invoice-data-binding Specification

## Purpose

TBD - created by archiving change invoice-renderer. Update Purpose after archive.

## Requirements

### Requirement: El documento declara el contrato de sus datos

El documento DEBE (MUST) declarar un `dataSchema` que enumere las rutas que consume,
indicando para cada una si es obligatoria y de qué tipo es. Es el documento —no el código
que lo renderiza— quien define qué datos necesita.

Con esto el editor puede enseñar qué datos hacen falta y el embed puede rechazar una carga
incompleta antes de pintar media factura.

#### Scenario: Toda ruta usada está declarada

- **WHEN** se valida un documento que usa `cliente.nombre` en un fragmento de tipo binding
  sin declararla en su `dataSchema`
- **THEN** la validación falla nombrando la ruta no declarada

#### Scenario: Documento vacío

- **WHEN** se llama a `emptyDocument()`
- **THEN** el documento resultante tiene un `dataSchema` vacío y es válido

### Requirement: Una ruta obligatoria ausente detiene el render

El render DEBE (MUST) fallar cuando falte un dato declarado como obligatorio, informando de
todas las rutas ausentes y no solo de la primera. Una ruta declarada como opcional y
ausente DEBE resolverse como cadena vacía.

#### Scenario: Falta un dato obligatorio

- **WHEN** se renderiza un documento cuyo `dataSchema` declara `cliente.nombre` como
  obligatoria y los datos no la traen
- **THEN** el render falla nombrando `cliente.nombre`

#### Scenario: Se informan todas las ausencias

- **WHEN** faltan tres rutas obligatorias
- **THEN** el error las nombra las tres

#### Scenario: Una ruta opcional ausente se pinta vacía

- **WHEN** se renderiza un documento cuyo `dataSchema` declara `cliente.nif` como opcional
  y los datos no la traen
- **THEN** el render produce marcado con ese hueco vacío, sin error

#### Scenario: Un valor presente pero nulo cuenta como ausente

- **WHEN** una ruta obligatoria está presente en los datos con valor `null`
- **THEN** el render falla como si faltara

### Requirement: Resolución de rutas

Una ruta DEBE (MUST) poder atravesar objetos anidados con puntos y colecciones con índices.
Dentro de la banda `detail` DEBE existir una raíz que apunte al ítem de la iteración en
curso, de forma que la misma ruta sirva para todos los ítems.

#### Scenario: Ruta anidada

- **WHEN** se resuelve `emisor.direccion.ciudad` contra unos datos que la contienen
- **THEN** devuelve ese valor

#### Scenario: Índice de colección

- **WHEN** se resuelve `items[0].descripcion`
- **THEN** devuelve la descripción del primer ítem

#### Scenario: La banda detail resuelve contra su ítem

- **WHEN** un bloque de la banda `detail` usa la ruta `item.total` y hay tres ítems
- **THEN** cada repetición de la banda muestra el total de su propio ítem

#### Scenario: Ruta que atraviesa un valor inexistente

- **WHEN** se resuelve `cliente.direccion.ciudad` y `cliente.direccion` no existe
- **THEN** la resolución indica ausencia sin lanzar un error de acceso a propiedad

### Requirement: Filtros de formato

Un fragmento de tipo binding DEBE (MUST) poder declarar un formato, y el render DEBE
aplicarlo mediante `Intl`. Los formatos iniciales son `currency`, `number`, `date` y
`percent`. Un formato no reconocido DEBE tratarse como ausencia de formato y no romper el
render.

`Intl` es nativo en Node y en el navegador, de modo que el mismo dato produce la misma
cadena en el servidor y en el preview.

#### Scenario: Moneda

- **WHEN** se formatea `1234.5` con el formato `currency`, locale `es-ES` y moneda `EUR`
- **THEN** produce la cadena que `Intl.NumberFormat` genera para esos parámetros

#### Scenario: El servidor y el navegador coinciden

- **WHEN** se formatea el mismo valor con el mismo locale en Node y en el navegador
- **THEN** ambas cadenas son idénticas

#### Scenario: Formato desconocido

- **WHEN** un fragmento declara el formato `moneda`
- **THEN** el valor se pinta sin formatear y el render no falla

#### Scenario: Valor no numérico con formato numérico

- **WHEN** se formatea la cadena `"n/d"` con el formato `currency`
- **THEN** se pinta el valor tal cual, sin `NaN`

### Requirement: Procedencia del locale y la moneda

El documento DEBE (MUST) declarar su locale y su moneda, y el embed DEBE poder
sobreescribirlos mediante los parámetros que el propio documento declare. NO DEBE (MUST
NOT) usarse el locale del navegador: Node y el navegador darían resultados distintos y el
preview dejaría de coincidir con el render.

#### Scenario: Valores por defecto del documento

- **WHEN** se renderiza sin parámetros un documento que declara locale `es-ES` y moneda
  `EUR`
- **THEN** los importes se formatean con ese locale y esa moneda

#### Scenario: Sobreescritura por parámetro

- **WHEN** el documento declara un parámetro que controla la moneda y el embed lo pasa como
  `USD`
- **THEN** los importes se formatean en dólares sin tocar ningún bloque

#### Scenario: Parámetro de locale no declarado

- **WHEN** el embed pasa un locale que el documento no declara como parámetro
- **THEN** se ignora y se usa el locale del documento
