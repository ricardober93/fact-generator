# invoice-embed Specification

## Purpose
TBD - created by archiving change embed-iframe. Update Purpose after archive.
## Requirements
### Requirement: El embed sirve el documento renderizado en el servidor

`GET /embed/:token` DEBE (MUST) cargar el handoff y su plantilla, resolver los assets, llamar
al motor de render y devolver el documento ya pintado en el HTML de la respuesta.

Ver la factura e imprimirla NO DEBEN (MUST NOT) requerir JavaScript.

#### Scenario: El documento llega pintado

- **WHEN** se pide el embed con un token vigente
- **THEN** la respuesta es 200 y su HTML ya contiene el contenido de la factura

#### Scenario: Sin JavaScript se imprime igual

- **WHEN** se carga el embed con el JavaScript deshabilitado
- **THEN** la factura se ve completa y el CSS de impresión está presente

#### Scenario: Token caducado o desconocido

- **WHEN** se pide el embed con un token caducado o inexistente
- **THEN** responde 404 con un aviso legible, sin filtrar si el token existió alguna vez

### Requirement: El embed nunca es una vista estática

La ruta del embed NO DEBE (MUST NOT) declararse `@view({ static })`.

Una vista estática se sirve desde caché saltándose los middlewares, de modo que el documento
de un cliente acabaría entregándose a cualquier otro visitante.

#### Scenario: La ruta no está marcada como estática

- **WHEN** se inspecciona la configuración de la vista del embed
- **THEN** no declara `static`

#### Scenario: Dos tokens distintos dan documentos distintos

- **WHEN** se piden seguidos dos embeds con tokens de datos diferentes
- **THEN** cada respuesta contiene sus propios datos y ninguna repite los del anterior

### Requirement: Los parámetros se validan contra el schema de la plantilla

El embed DEBE (MUST) validar los parámetros de la URL contra el schema `params` que declara
la propia plantilla. Un parámetro no declarado DEBE ignorarse; un valor fuera de los
admitidos DEBE caer al valor por defecto.

#### Scenario: Parámetro declarado

- **WHEN** se pide el embed con un parámetro que la plantilla declara
- **THEN** el documento se pinta con ese valor aplicado

#### Scenario: Parámetro no declarado

- **WHEN** se pide el embed con un parámetro que la plantilla no declara
- **THEN** se ignora y el documento se pinta con sus valores por defecto

#### Scenario: Valor inadmisible

- **WHEN** se pide el embed con un valor fuera de la lista admitida de un parámetro
  enumerado
- **THEN** se conserva el valor por defecto y la respuesta sigue siendo 200

### Requirement: Solo se cargan los assets que la plantilla usa

El embed DEBE (MUST) resolver únicamente los assets referenciados por la plantilla y
entregarlos al render como data URIs. NO DEBE cargar el catálogo entero de assets.

#### Scenario: Se carga el asset referenciado

- **WHEN** se pinta una plantilla cuyo tema apunta a un asset existente
- **THEN** el documento contiene ese asset como `<img src="data:...">`

#### Scenario: No se cargan los assets ajenos

- **WHEN** se pinta una plantilla que referencia un asset y existen otros tres en la base
- **THEN** solo se lee de la base el asset referenciado

#### Scenario: Asset referenciado pero ausente

- **WHEN** la plantilla referencia un asset que ya no existe
- **THEN** el documento se pinta igualmente, con el hueco vacío y sin error

### Requirement: Un dato obligatorio ausente produce un aviso accionable

Cuando el render falle por datos obligatorios ausentes, el embed DEBE (MUST) responder con
un aviso legible que nombre las rutas que faltan, en lugar de una página en blanco o un
error genérico.

Son nombres de campo de una plantilla propia, no datos de cliente: nombrarlos ayuda a quien
integra y no expone nada.

#### Scenario: Se nombran las rutas ausentes

- **WHEN** el handoff se creó saltándose la validación y falta una ruta obligatoria
- **THEN** la respuesta nombra esa ruta en un texto legible

#### Scenario: No se filtra el detalle interno

- **WHEN** se produce ese aviso
- **THEN** no contiene trazas de pila ni rutas de archivos del servidor

### Requirement: El iframe comunica su altura al contenedor

El embed DEBE (MUST) publicar la altura de su contenido al documento padre mediante
`postMessage`, y DEBE actualizarla cuando el contenido cambie de tamaño.

El padre no puede medir el interior de un iframe de otro documento, así que sin este aviso
la única alternativa es recortar la factura o dejar un hueco fijo.

#### Scenario: Se anuncia la altura al cargar

- **WHEN** el embed termina de cargar
- **THEN** envía al padre un mensaje con la altura de su contenido

#### Scenario: Se reanuncia al cambiar de tamaño

- **WHEN** el contenido cambia de altura
- **THEN** se envía un mensaje nuevo con la altura actualizada

#### Scenario: La altura es una mejora, no un requisito

- **WHEN** el JavaScript está deshabilitado
- **THEN** la factura se sigue viendo completa y solo se pierde el ajuste automático

