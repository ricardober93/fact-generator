## ADDED Requirements

### Requirement: Un artículo lleva lo que cabe en una línea, y el código con el que se busca

Un artículo DEBE (MUST) declarar un código, un nombre, un precio unitario y un impuesto. NO DEBE
(MUST NOT) exigírsele ningún otro campo.

Son los cuatro campos que el contrato de catálogo entrega, más el código, que existe porque una
persona busca por él. Categoría, proveedor, ubicación, coste o mínimos no caben en una línea de
factura, así que tampoco entran aquí: cada campo que se añade sin consumidor es superficie que
romperá cuando alguien la cambie.

#### Scenario: Se crea con sus datos

- **WHEN** se da de alta un artículo con código, nombre, precio e impuesto
- **THEN** queda guardado con esos cuatro valores

#### Scenario: Sin código o sin nombre no se crea

- **WHEN** se intenta dar de alta un artículo sin código, o sin nombre
- **THEN** la creación falla y no queda ningún artículo guardado

#### Scenario: Un precio negativo no se crea

- **WHEN** se intenta dar de alta un artículo con precio unitario menor que cero
- **THEN** la creación falla

### Requirement: Los artículos son de su empresa

Todo artículo DEBE (MUST) pertenecer a una empresa, y toda consulta DEBE recibirla como parámetro.
Un artículo de otra empresa DEBE responder como si no existiera.

Es la misma regla que ya gobierna documentos, plantillas y rangos, y por el mismo motivo: el
repositorio es `singleton()`, así que un alcance inyectado se quedaría con la empresa del primer
visitante. Olvidar el parámetro no compila.

#### Scenario: El listado sólo trae los de la empresa activa

- **WHEN** dos empresas tienen artículos y se listan con la empresa activa de la sesión
- **THEN** sólo aparecen los suyos

#### Scenario: Un artículo de otra empresa no existe

- **WHEN** se pide por identificador un artículo de otra empresa
- **THEN** responde como si no existiera

#### Scenario: El mismo código en otra empresa vale

- **WHEN** una empresa tiene un artículo con código `A-1` y otra empresa crea otro con ese código
- **THEN** los dos quedan guardados

### Requirement: Los artículos se buscan por texto

La búsqueda DEBE (MUST) encontrar por código y por nombre, y DEBE devolver una lista vacía cuando no
haya coincidencias.

Es lo que el contrato de catálogo pide como primera de sus dos preguntas, así que se resuelve aquí
una vez en vez de en cada consumidor.

#### Scenario: Encuentra por código y por nombre

- **WHEN** se busca un texto que aparece en el código de un artículo y en el nombre de otro
- **THEN** los dos aparecen en el resultado

#### Scenario: Sin coincidencias devuelve vacío

- **WHEN** se busca un texto que no aparece en ningún artículo
- **THEN** el resultado está vacío y no es un error

### Requirement: Sólo administración mantiene el catálogo

Dar de alta, editar y borrar un artículo DEBE (MUST) exigir rol de administrador. Cajero y lectura
DEBEN poder consultarlo y NO DEBEN poder escribirlo.

El cajero necesita el catálogo para vender, no para cambiarlo; un precio editable desde la caja es un
descuadre esperando su turno.

#### Scenario: El cajero consulta y no escribe

- **WHEN** un cajero abre el catálogo e intenta dar de alta un artículo
- **THEN** lo ve, y el alta se rechaza antes de tocar el dominio

#### Scenario: Lectura tampoco escribe

- **WHEN** un usuario de sólo lectura intenta editar un artículo
- **THEN** la acción se rechaza

#### Scenario: Sin sesión responde como cualquier ruta protegida

- **WHEN** se pide el catálogo sin sesión
- **THEN** responde como cualquier ruta protegida, sin revelar si el rol habría bastado
