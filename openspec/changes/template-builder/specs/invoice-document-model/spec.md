## MODIFIED Requirements

### Requirement: Registro de tipos de bloque

Un tipo de bloque DEBE (MUST) definirse en un único archivo mediante `defineBlock()`, aportando
su identificador `kind`, su schema de propiedades, sus valores por defecto y su función de
render. El registro DEBE exponer la lista de tipos disponibles y la resolución de un `kind` a su
definición.

El componente `Inspector` de una definición es **opcional**. El schema de propiedades es el
contrato que dirige la edición: declarar el tipo de cada propiedad basta para que esa propiedad
sea editable. Una definición solo aporta `Inspector` cuando alguna de sus propiedades no se deja
editar por su tipo. Un tipo de bloque nuevo NO DEBE (MUST NOT) tener que escribir un panel de
propiedades para tenerlo.

El cambio incorpora cuatro tipos: `text`, `image`, `box` y `line`.

#### Scenario: Registrar un tipo hace que exista

- **WHEN** se consulta el registro tras cargar los cuatro archivos de tipo
- **THEN** devuelve exactamente los tipos `text`, `image`, `box` y `line`

#### Scenario: Bloque de tipo desconocido

- **WHEN** se valida un documento con un bloque cuyo `kind` no está en el registro
- **THEN** la validación falla nombrando el `kind` desconocido

#### Scenario: Los defaults completan un bloque nuevo

- **WHEN** se crea un bloque indicando solo su `kind`
- **THEN** el bloque resultante tiene todas las propiedades de ese tipo rellenadas con los
  valores por defecto declarados por su definición

#### Scenario: Propiedad fuera del schema del tipo

- **WHEN** se valida un bloque `line` que declara una propiedad que su schema no contempla
- **THEN** la validación falla nombrando la propiedad sobrante

#### Scenario: Un tipo sin Inspector es una definición válida

- **WHEN** se define un tipo de bloque que no aporta `Inspector`
- **THEN** la definición es válida y el registro la acepta, y el tipo de cada propiedad de su
  schema es lo que determina cómo se edita
