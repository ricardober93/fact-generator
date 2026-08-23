# user-accounts Specification

## Purpose

TBD - created by archiving change company-scoping. Update Purpose after archive.

## Requirements

### Requirement: Cada persona entra con su propia credencial

DEBE (MUST) existir una entidad de usuario con correo, contraseña, rol y **las empresas a las que
pertenece**. El acceso DEBE
comprobarse contra ella. La contraseña NO DEBE (MUST NOT) guardarse en claro: se guarda su hash, con
la utilidad de contraseñas del framework.

#### Scenario: Un usuario entra con lo suyo

- **WHEN** se envían el correo y la contraseña de un usuario existente
- **THEN** la sesión queda abierta

#### Scenario: La contraseña no se guarda en claro

- **WHEN** se inspecciona un usuario guardado
- **THEN** expone un hash y no el texto de la contraseña

#### Scenario: Dos usuarios no comparten correo

- **WHEN** se intenta crear un usuario con un correo que ya existe
- **THEN** la creación falla y no queda nada guardado

### Requirement: El primer administrador se siembra desde el entorno

Al arrancar sin ningún usuario, el sistema DEBE (MUST) crear el primer administrador con `AUTH_EMAIL`
y `AUTH_PASSWORD`. Con usuarios ya creados, esas variables DEBEN ignorarse.

Sin esto, un despliegue nuevo no tendría por dónde entrar a crear el primer usuario. Con esto, el
primer arranque sigue siendo exactamente lo que era: dos variables de entorno.

#### Scenario: El primer arranque crea al administrador

- **WHEN** se arranca sin ningún usuario y con las dos variables definidas
- **THEN** queda creado un administrador con ese correo

#### Scenario: El segundo arranque no toca nada

- **WHEN** se arranca con usuarios ya existentes y las variables definidas
- **THEN** no se crea ni se modifica ningún usuario

#### Scenario: Sigue sin haber registro público

- **WHEN** se recorre la superficie HTTP
- **THEN** no existe ninguna ruta de alta que no exija sesión de administrador

### Requirement: La sesión dice quién es, no solo que alguien entró

La sesión DEBE (MUST) identificar al usuario y su empresa. Las vistas y acciones DEBEN poder saber
quién las está pidiendo.

#### Scenario: La sesión lleva la identidad

- **WHEN** un usuario abre sesión
- **THEN** la sesión permite recuperar su identificador, su rol y la empresa en la que opera

#### Scenario: Un usuario dado de baja no entra

- **WHEN** se da de baja a un usuario y este vuelve a intentar entrar
- **THEN** el acceso se rechaza igual que unas credenciales erróneas

### Requirement: El usuario elige en qué empresa opera, y puede cambiar

La sesión DEBE (MUST) declarar cuál de las empresas del usuario está activa, y todo el alcance —
documentos, plantillas, assets y rangos— DEBE resolverse contra ella.

DEBE existir una acción para cambiar de empresa. Cambiar DEBE comprobar que el usuario pertenece a la
empresa pedida y DEBE volver a firmar la sesión: la empresa activa viaja dentro del token, nunca en
una cookie aparte ni en el estado del cliente. Con dos sitios donde vive la respuesta, la que manda
acaba siendo la que alguien olvidó comprobar.

Un usuario que pertenece a una sola empresa NO DEBE (MUST NOT) tener que elegir nada.

#### Scenario: Cambiar de empresa cambia lo que se ve

- **WHEN** un usuario que pertenece a dos empresas cambia a la segunda y abre el listado
- **THEN** ve los documentos de la segunda y ninguno de la primera

#### Scenario: No se cambia a una empresa ajena

- **WHEN** se pide cambiar a una empresa a la que el usuario no pertenece
- **THEN** la petición se rechaza y la empresa activa no cambia

#### Scenario: La empresa activa sobrevive a la navegación

- **WHEN** se cambia de empresa y después se abren varias páginas
- **THEN** todas se resuelven contra la empresa elegida, sin volver a preguntarla

#### Scenario: Con una sola empresa no se elige

- **WHEN** un usuario pertenece a una única empresa
- **THEN** opera en ella sin que se le pida escogerla

### Requirement: Cada documento guarda quién lo emitió

Al emitir, el documento DEBE (MUST) guardar el identificador y el nombre de la persona que lo emitió,
congelados con el resto.

Se guarda el nombre además del identificador por la misma razón que `corrects` guarda el número: para
que siga siendo legible cuando ese usuario ya no exista.

#### Scenario: El autor queda con el documento

- **WHEN** se emite un documento
- **THEN** queda guardado quién lo emitió, con su nombre

#### Scenario: El autor sobrevive a la baja

- **WHEN** se da de baja a quien emitió un documento y se abre ese documento
- **THEN** sigue mostrando su nombre

#### Scenario: Un borrador no tiene autor de emisión

- **WHEN** se abre un borrador
- **THEN** no muestra ningún autor de emisión
