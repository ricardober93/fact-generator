# invoice-handoff Specification

## Purpose

TBD - created by archiving change embed-iframe. Update Purpose after archive.

## Requirements

### Requirement: Los datos se entregan antes de abrir el iframe

El servidor del producto padre DEBE (MUST) poder entregar los datos de una factura y recibir
a cambio un identificador opaco. El iframe DEBE poder abrirse con solo ese identificador.

Los datos de la factura NO DEBEN (MUST NOT) viajar nunca en la URL del iframe: las URLs
tienen límite de longitud, quedan en los logs de cualquier proxy intermedio y se filtran por
la cabecera `Referer`.

#### Scenario: Entrega y apertura

- **WHEN** el padre entrega `templateId`, datos e ítems
- **THEN** recibe un token, y abrir el embed con ese token pinta la factura con esos datos

#### Scenario: La URL no contiene datos

- **WHEN** se inspecciona la URL del iframe
- **THEN** contiene el token y los parámetros declarados, y ningún valor de los datos

#### Scenario: El token no es adivinable

- **WHEN** se generan dos handoffs seguidos
- **THEN** sus tokens no son correlativos ni derivables uno del otro

### Requirement: El handoff caduca

Un handoff DEBE (MUST) declarar su instante de caducidad y DEBE dejar de servirse una vez
alcanzado. La vida por defecto es de 10 minutos, suficiente para abrir un iframe y no para
que el identificador siga sirviendo mañana.

Dentro de su ventana de vida el handoff DEBE poder leerse **más de una vez**: un iframe se
recarga al imprimir, al cambiar un parámetro o al pulsar F5, y un identificador de un solo
uso rompería los tres casos.

#### Scenario: Lectura dentro de la ventana

- **WHEN** se lee un handoff creado hace un minuto
- **THEN** devuelve sus datos

#### Scenario: Lectura repetida

- **WHEN** se lee tres veces el mismo handoff vigente
- **THEN** las tres devuelven los mismos datos

#### Scenario: Lectura después de caducar

- **WHEN** se lee un handoff cuyo instante de caducidad ya pasó
- **THEN** se comporta como inexistente

#### Scenario: Token desconocido

- **WHEN** se lee un token que nunca existió
- **THEN** se comporta igual que uno caducado, sin distinguir ambos casos

### Requirement: El handoff se valida al crearse

La creación DEBE (MUST) rechazar un `templateId` que no exista, y DEBE rechazar unos datos
que no satisfagan el contrato declarado por la plantilla. El error DEBE nombrar las rutas
obligatorias ausentes.

Fallar aquí es mucho mejor que fallar dentro del iframe: el integrador recibe el error en su
propia llamada, no en una página incrustada.

#### Scenario: Plantilla inexistente

- **WHEN** se entrega un `templateId` que no existe
- **THEN** la creación falla y no se guarda ningún handoff

#### Scenario: Faltan datos obligatorios

- **WHEN** se entregan datos a los que les faltan dos rutas obligatorias de la plantilla
- **THEN** la creación falla nombrando las dos, y no se guarda ningún handoff

#### Scenario: Datos completos

- **WHEN** se entregan datos que satisfacen el contrato de la plantilla
- **THEN** la creación devuelve un token

### Requirement: Los handoffs caducados se borran

DEBE (MUST) existir una tarea periódica que elimine los handoffs cuya caducidad haya pasado.
Sin ella la tabla crece sin límite guardando datos de clientes que ya nadie necesita.

#### Scenario: La limpieza borra lo caducado y respeta lo vigente

- **WHEN** se ejecuta la limpieza con dos handoffs caducados y uno vigente
- **THEN** los dos caducados desaparecen y el vigente permanece
