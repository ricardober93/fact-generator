## REMOVED Requirements

### Requirement: Hay un único operador y sus credenciales vienen del entorno

**Reason**: La identidad pasa del entorno a la base de datos. Un solo operador significa que cada
persona a partir de la segunda comparte credencial y que ningún documento sabe quién lo emitió, lo
cual deja de ser aceptable en cuanto lo que se emite es un registro fiscal. Lo sustituye
`user-accounts`: usuarios con credencial propia, y `AUTH_EMAIL`/`AUTH_PASSWORD` degradadas a semilla
del primer administrador.

**Migration**: Ninguna acción manual. Al arrancar sin usuarios, esas mismas dos variables crean el
primer administrador, así que un despliegue existente sigue entrando con lo que ya tenía. Los otros
siete requisitos de `app-auth` no cambian: describen cómo se entra, no quién entra.

## ADDED Requirements

### Requirement: El arranque sigue exigiendo su secreto

Sin `JWT_SECRET` la aplicación NO DEBE (MUST) arrancar, y DEBE fallar con un mensaje que nombre la
variable que falta.

Una aplicación protegida que arranca sin secreto es una aplicación sin protección, y fallar al
arrancar es la única forma de que el descuido se note. Se conserva de lo que se retira, porque no
tenía nada que ver con quién es el operador.

#### Scenario: Arranque sin secreto

- **WHEN** se intenta arrancar sin `JWT_SECRET`
- **THEN** el arranque falla nombrando la variable

#### Scenario: Arranque sin semilla y sin usuarios

- **WHEN** se arranca sin usuarios en la base y sin `AUTH_EMAIL` o `AUTH_PASSWORD`
- **THEN** el arranque falla diciendo que no hay forma de crear el primer administrador
