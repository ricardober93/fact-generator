## ADDED Requirements

### Requirement: El contrato lo declara quien lo consume, y cabe en una línea

Un origen de catálogo DEBE (MUST) responder a dos preguntas: buscar por texto y recuperar uno por su
referencia. Cada resultado DEBE traer exactamente `ref`, `code`, `label`, `unitPrice` y `taxRate`, y
NO DEBE (MUST NOT) exigirse ningún otro campo.

El contrato es pequeño porque lo define lo que hace falta para rellenar una línea de factura, no lo
que un sistema de inventario tiene guardado. Categoría, proveedor, ubicación, mínimos o costes no
caben en una línea, así que no entran en el contrato: serían superficie que rompe cuando cambie.

#### Scenario: Buscar devuelve lo que cabe en una línea

- **WHEN** se busca por texto contra un origen configurado
- **THEN** cada resultado trae referencia, código, nombre, precio unitario e impuesto

#### Scenario: Los campos de más se ignoran

- **WHEN** un origen devuelve además campos que el contrato no declara
- **THEN** se ignoran y el resultado se usa igual

#### Scenario: Un resultado incompleto se descarta

- **WHEN** un origen devuelve un elemento sin nombre o sin precio
- **THEN** ese elemento no se ofrece, y los demás sí

### Requirement: La referencia es opaca

`ref` DEBE (MUST) tratarse como una cadena sin estructura: se guarda y se devuelve tal cual. NO DEBE
(MUST NOT) interpretarse, partirse, usarse para construir una URL ni tratarse como clave ajena.

Mientras sea opaca, el proveedor puede cambiar de identificadores, de base de datos o de esquema sin
avisar a nadie. En cuanto alguien la parta para sacarle algo dentro, la frontera está rota y no se
notará hasta que despliegue el otro lado.

#### Scenario: Se devuelve exactamente lo que se recibió

- **WHEN** se guarda una línea elegida de un origen y después se vuelve a leer
- **THEN** su referencia es idéntica carácter a carácter a la que dio el origen

#### Scenario: Ninguna referencia se interpreta

- **WHEN** se recorre el código que trata con referencias de catálogo
- **THEN** ninguna las parte, las parsea ni las usa para componer una ruta

### Requirement: El origen es configuración, y sin él la aplicación está entera

El origen DEBE (MUST) declararse con una variable de entorno que contenga su URL base. Sin esa
variable NO DEBE (MUST NOT) haber selector, ni llamadas, ni avisos de error: escribir las líneas a
mano es el camino normal, no un modo degradado.

Es lo que hace verdad que cada app pueda vivir sola: la aplicación arranca y funciona entera con
todas las demás ausentes.

#### Scenario: Sin origen configurado no cambia nada

- **WHEN** no hay variable de origen y se abre el formulario de una factura
- **THEN** las líneas se escriben a mano igual que antes y no se ofrece ningún selector

#### Scenario: Con origen configurado aparece el selector

- **WHEN** hay una variable de origen y se abre el formulario
- **THEN** las líneas ofrecen elegir del catálogo

### Requirement: La versión va en la ruta

Las llamadas DEBEN (MUST) dirigirse a rutas versionadas del origen: `/v1/items` para buscar y
`/v1/items/{ref}` para recuperar uno.

Con la versión en la ruta, un proveedor puede servir dos contratos a la vez mientras dura una
transición, en vez de coordinar un despliegue simultáneo de dos aplicaciones.

#### Scenario: Se llama a la ruta versionada

- **WHEN** se busca contra un origen
- **THEN** la petición va a `/v1/items` bajo la URL base configurada

### Requirement: Un origen que falla nunca bloquea una factura

Cuando el origen no responda, tarde demasiado o devuelva algo que no encaje con el contrato, el
sistema DEBE (MUST) degradar a escribir a mano. NO DEBE (MUST NOT) impedir guardar, impedir emitir,
mostrar una página de error ni dejar el formulario inservible.

El origen sirve para teclear menos. Tratarlo como dependencia dura convertiría la caída de otra
aplicación en una parada de la facturación.

#### Scenario: El origen no responde

- **WHEN** el origen está caído y se busca un producto
- **THEN** se avisa de que no está disponible y la línea se puede escribir a mano

#### Scenario: El origen tarda demasiado

- **WHEN** el origen no contesta dentro del tiempo máximo
- **THEN** la búsqueda se abandona y se puede seguir trabajando

#### Scenario: El origen devuelve algo que no encaja

- **WHEN** el origen responde con algo que no es la forma declarada
- **THEN** se trata como si no hubiera resultados, sin romper la página

#### Scenario: Guardar y emitir no dependen del origen

- **WHEN** el origen está caído y se guarda y se emite una factura con líneas escritas a mano
- **THEN** las dos operaciones funcionan con normalidad
