## ADDED Requirements

### Requirement: Una lista de celdas se pinta resolviendo cada celda

El render DEBE (MUST) pintar cada celda de una propiedad de celdas resolviendo su ruta en el
contexto vigente y aplicando su formato y su alineación. Un bloque que dispone sus celdas en
horizontal DEBE respetar el ancho declarado de cada una, empezando en el origen del bloque; uno
que las apila en vertical reparte el alto del bloque entre sus filas. Una ruta que no resuelve
DEBE pintar la celda vacía sin detener el render, y la etiqueta de una celda NO DEBE (MUST NOT)
interpretarse como marcado.

#### Scenario: Cada celda pinta su valor formateado

- **WHEN** se renderiza un bloque de celdas en la banda `detail` con un ítem cuyas rutas resuelven
- **THEN** aparece una celda por cada declarada, con el valor de su ruta formateado según su
  formato

#### Scenario: Los anchos declarados se respetan

- **WHEN** se renderiza un bloque con celdas de 30 mm y 20 mm
- **THEN** la primera ocupa 30 mm desde el origen del bloque y la segunda empieza donde acaba la
  primera

#### Scenario: Las celdas apiladas emiten etiqueta y valor

- **WHEN** se renderiza un bloque que apila sus celdas
- **THEN** cada fila contiene la etiqueta de su celda y el valor de su ruta

#### Scenario: Una ruta ausente no rompe el render

- **WHEN** se renderiza un bloque de celdas cuya ruta no existe en los datos y no es obligatoria
- **THEN** la celda queda vacía y el resto del documento se pinta

#### Scenario: Marcado en una etiqueta se pinta como texto

- **WHEN** la etiqueta de una celda es `<b>Total</b>`
- **THEN** el usuario ve esos caracteres y el DOM no contiene un elemento `b`

### Requirement: La cabecera de un bloque de detalle se proyecta en detailHeader

Cuando un bloque de la banda `detail` pertenece a un tipo que aporta `renderHeader`, el render
DEBE (MUST) emitir esa cabecera dentro de la banda `detailHeader`, una sola vez, con la misma
coordenada horizontal y el mismo ancho que el bloque de origen. La proyección NO DEBE (MUST NOT)
alterar la cardinalidad de las bandas ni emitir un segundo contenedor con el mismo `data-block`:
se identifica con su propio atributo, que referencia el bloque de origen.

Es lo que permite que una tabla de ítems sea un único bloque sin perder la repetición de la
cabecera en cada página impresa, que sale del `<thead>`.

#### Scenario: La cabecera aparece una vez aunque haya muchos ítems

- **WHEN** se renderiza con tres ítems un documento con un bloque de `detail` que aporta cabecera
- **THEN** su cabecera aparece una sola vez, dentro del `<thead>`, y la banda `detail` tres veces

#### Scenario: La proyección comparte geometría horizontal con su bloque

- **WHEN** el bloque de origen está en `xMm` 20 con 60 mm de ancho
- **THEN** su cabecera proyectada ocupa esa misma coordenada y ese mismo ancho dentro de
  `detailHeader`

#### Scenario: La proyección no duplica el identificador de bloque

- **WHEN** se renderiza un documento con un bloque de `detail` que aporta cabecera
- **THEN** la banda `detailHeader` no contiene ningún contenedor con el `data-block` de ese
  bloque, y la proyección se identifica con un atributo propio que lo referencia

#### Scenario: Un bloque sin cabecera no proyecta nada

- **WHEN** se renderiza un documento cuyos bloques de `detail` no aportan `renderHeader`
- **THEN** la banda `detailHeader` contiene únicamente sus propios bloques

## MODIFIED Requirements

### Requirement: Cada tipo de bloque aporta su render

Cada definición del registro DEBE (MUST) aportar una función `render` que reciba el bloque
y su contexto y devuelva marcado. Renderizar un bloque cuyo `kind` no está en el registro
DEBE producir un error explícito, nunca marcado silenciosamente vacío.

La función `renderHeader` es opcional y solo se invoca para bloques de la banda `detail`; su
ausencia NO DEBE (MUST NOT) impedir que el tipo se registre ni se pinte.

Los seis tipos son `text`, `image`, `box`, `line`, `table` y `list`.

#### Scenario: Cada tipo produce marcado

- **WHEN** se renderiza un bloque de cada uno de los seis tipos
- **THEN** cada uno produce su marcado, y ninguno queda vacío

#### Scenario: Tipo desconocido

- **WHEN** se intenta renderizar un bloque cuyo `kind` no está en el registro
- **THEN** el render falla nombrando el `kind` desconocido
