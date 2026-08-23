# access-control Specification

## Purpose

TBD - created by archiving change company-scoping. Update Purpose after archive.

## Requirements

### Requirement: Cada usuario tiene un rol y el rol decide qué puede hacer

Un usuario DEBE (MUST) tener exactamente uno de tres roles: administrador, cajero o lectura. El rol
DEBE decidir qué operaciones se le permiten:

|                                              | administrador | cajero | lectura |
| -------------------------------------------- | ------------- | ------ | ------- |
| Ver documentos, listados e imprimir          | sí            | sí     | sí      |
| Crear, guardar, emitir y corregir documentos | sí            | sí     | no      |
| Rangos de numeración                         | sí            | no     | no      |
| Plantillas y assets                          | sí            | no     | no      |
| Usuarios y empresa                           | sí            | no     | no      |

Son tres y no los cinco del brief porque «admin de empresa» y «supervisor de sede» no se distinguen
de nada mientras no haya sedes ni una segunda empresa.

#### Scenario: El cajero trabaja con documentos

- **WHEN** un cajero crea, guarda y emite una factura
- **THEN** las tres operaciones se permiten

#### Scenario: El cajero no toca la numeración

- **WHEN** un cajero intenta crear un rango de numeración
- **THEN** la operación se rechaza y no queda ningún rango nuevo

#### Scenario: Lectura no escribe nada

- **WHEN** un usuario de lectura intenta guardar o emitir un documento
- **THEN** las dos operaciones se rechazan

#### Scenario: Lectura sí ve e imprime

- **WHEN** un usuario de lectura abre un documento emitido
- **THEN** lo ve completo y puede imprimirlo

### Requirement: El rol se comprueba donde no se puede saltar

La comprobación de rol DEBE (MUST) hacerse en un middleware de ruta, no repartida dentro de los
métodos. Una operación no permitida NO DEBE (MUST NOT) llegar a escribir nada.

Repartir comprobaciones dentro de los métodos hace que la que falta no se vea; un middleware por ruta
se lee entero de un vistazo, como ya ocurre con la sesión.

#### Scenario: La comprobación va antes que el trabajo

- **WHEN** un cajero pide una acción reservada al administrador
- **THEN** se rechaza sin haber leído ni escrito nada del dominio

#### Scenario: Sin sesión sigue mandando la sesión

- **WHEN** se pide una acción reservada sin ninguna sesión
- **THEN** responde como cualquier otra ruta protegida sin sesión, sin revelar si el rol habría
  bastado

### Requirement: Nadie se queda sin administrador

Quitarse a uno mismo el rol de administrador, o darse de baja, DEBE (MUST) rechazarse si no queda
ningún otro administrador en la empresa.

Una empresa sin administrador es una empresa donde nadie puede volver a crear usuarios, cambiar roles
ni añadir un rango: se recupera tocando la base de datos a mano.

#### Scenario: El último administrador no se degrada

- **WHEN** el único administrador intenta cambiarse el rol a cajero
- **THEN** la operación se rechaza y conserva su rol

#### Scenario: Con otro administrador sí se puede

- **WHEN** hay dos administradores y uno se cambia a cajero
- **THEN** el cambio se acepta

### Requirement: Cada usuario solo ve lo de su empresa

Toda consulta de documentos, plantillas, assets y rangos DEBE (MUST) limitarse a la empresa del
usuario. El límite DEBE aplicarse en el repositorio, no en cada controlador.

Un repositorio que puede devolver documentos de otra empresa cuando alguien olvida una condición es
un repositorio que acabará haciéndolo.

#### Scenario: Los documentos de otra empresa no aparecen

- **WHEN** existen documentos de dos empresas y se abre el listado
- **THEN** solo aparecen los de la empresa del usuario

#### Scenario: Ni siquiera por su identificador

- **WHEN** se pide por su identificador un documento de otra empresa
- **THEN** responde como si no existiera

#### Scenario: Los rangos tampoco se cruzan

- **WHEN** se emite un documento
- **THEN** solo se consideran los rangos de la empresa del usuario
