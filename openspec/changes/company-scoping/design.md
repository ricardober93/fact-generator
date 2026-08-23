## Context

`invoice-issuance` dejó el documento emitido inmutable y numerado, y con eso hizo visible lo que
antes daba igual: **quién emite** sigue siendo texto libre dentro del blob de datos, tecleado
documento a documento, y el rango de numeración no pertenece a nadie.

`app-auth` reconoce hoy una identidad sembrada desde el entorno, sin tabla de usuarios. Sus ocho
requisitos describen **cómo** se entra —cookie, rutas protegidas, destino validado, límite de
intentos—; solo uno describe **quién** entra. Ese es el único que muere.

## Goals / Non-Goals

**Goals:**

- Que el emisor sea una entidad y no una errata potencial en cada documento.
- Que el rango de numeración tenga dueño, que es lo que lo convierte en una resolución.
- Que cada persona entre con su credencial y que cada documento sepa quién lo emitió.
- Que un rol diga qué se puede hacer, y que eso se compruebe donde no se pueda saltar.

**Non-Goals:**

- Sedes y cajas como entidades. Siguen sin lector.
- Facturación electrónica. La empresa trae el NIT que hará falta, y nada más.
- Permisos por documento, jerarquías de roles, o delegación.

## Decisions

### 1. `Company` entra como **emisor**, y la multi-empresa es su consecuencia

La razón de que exista no es «el brief pide multi-empresa»: es que hoy dos facturas del mismo emisor
pueden salir con razones sociales distintas por una errata, y una resolución de numeración se
concede a un NIT. Eso ya está roto con **una** empresa.

Que después se puedan tener varias sale gratis del mismo modelo. Al revés no: empezar por la
multi-empresa lleva a un `companyId` que nadie lee, que fue exactamente el motivo por el que este
cambio quedó fuera de `invoice-issuance`.

### 2. La segunda empresa está **cerrada hasta que haya usuarios**

Si hay dos empresas y la identidad viene del entorno, nada dice en cuál se está operando. No es una
limitación que se elija: es que la pregunta no tiene respuesta.

Por eso crear una segunda empresa se rechaza mientras no exista un usuario que la tenga asignada. Es
también lo que hace que la primera entrega valga sola: una empresa, un operador, emisor arreglado.

_Alternativa descartada_: un selector de empresa en la interfaz. Guardar «en qué empresa estoy» fuera
de la identidad es una sesión con dos verdades, y la que manda acaba siendo la que se olvidó de
comprobar.

### 3. `AUTH_EMAIL` y `AUTH_PASSWORD` pasan de ser la identidad a ser la **semilla**

Al arrancar sin ningún usuario, se crea el primer administrador con esas variables. Con usuarios ya
creados, se ignoran.

_Alternativa descartada_: un comando de alta. Añade un paso manual al primer despliegue para ahorrar
diez líneas. _Alternativa descartada_: registro público. `app-auth` lo prohíbe y sigue prohibido.

El arranque sigue fallando sin `JWT_SECRET`: eso no cambia.

### 4. Los datos del emisor los escribe el servidor en el blob, como el número

`render(doc, data, params, assets)` es puro y solo recibe datos: para que la plantilla siga pintando
`{{emisor.nombre}}` sin tocar el registro de bloques ni una sola plantilla, el servidor escribe los
caminos `emisor.*` desde la empresa **al guardar**, con el mismo `withPath` que ya usa el número.

Al emitir quedan congelados con todo lo demás. Una empresa que cambie de razón social no reescribe ni
un documento entregado.

_Alternativa descartada_: resolver el emisor al pintar. Un documento emitido dejaría de ser
reproducible, que es justo lo que `invoice-issuance` fue a garantizar.

### 5. El documento congela **quién** lo emitió, no a quién apunta

`issuedBy` guarda el identificador y el nombre de la persona en el momento de emitir. Guardar solo el
identificador obliga a ir a buscar un usuario que puede haberse dado de baja; guardar el nombre lo
deja legible para siempre. Es la misma razón por la que `corrects` guarda el número además del id.

### 6. El alcance de la empresa se comprueba en el repositorio

Igual que la congelación: el filtro por `companyId` vive donde pasan todos los llamadores, no en cada
controlador. Un repositorio que puede devolver documentos de otra empresa si alguien olvida una
condición es un repositorio que lo hará.

### 7. Tres roles, y lo que gatean

|                                    | administrador | cajero | lectura |
| ---------------------------------- | ------------- | ------ | ------- |
| Ver documentos y listados          | sí            | sí     | sí      |
| Imprimir                           | sí            | sí     | sí      |
| Crear, guardar y emitir documentos | sí            | sí     | no      |
| Corregir con nota de crédito       | sí            | sí     | no      |
| Rangos de numeración               | sí            | no     | no      |
| Plantillas y assets                | sí            | no     | no      |
| Usuarios y empresa                 | sí            | no     | no      |

Los cinco del brief incluían «admin de empresa» y «supervisor de sede». No entran porque no se
distinguen de nada: sin sedes no hay supervisor de sede, y sin varias empresas el admin de empresa es
el administrador.

_Consecuencia_: un cajero no puede crear un rango, así que un despliegue nuevo lo prepara un
administrador. Es la misma condición que ya existe —sin rango no se emite—, ahora con dueño.

### 8. La comprobación de rol es un middleware, no un `if` repetido

Un middleware por ruta, del mismo estilo que `RequireSession`, que ya existe y ya se aplica a todo el
controlador. Repartir comprobaciones dentro de los métodos hace que la que falta no se vea.

## Risks / Trade-offs

- **El caso de una sola persona se complica**: donde había dos variables de entorno ahora hay una
  tabla, un alta y un rol → La semilla de la decisión 3 hace que el primer arranque siga siendo dos
  variables. Nadie tiene que crear un usuario para empezar.
- **Los borradores anteriores llevan `emisor.*` tecleado** → Al guardarlos se sobrescribe con el de la
  empresa. Los emitidos no se tocan: están congelados y congelado también significa a salvo de las
  migraciones.
- **`companyId` en todas las consultas es código sin lector mientras haya una empresa** → Cierto, y es
  el precio de que la segunda no obligue a revisar cada consulta a mano. Se paga una vez y se
  comprueba con pruebas que siembran dos empresas aunque la aplicación solo permita una.
- **Un rol mal asignado deja a alguien sin poder trabajar** → El administrador puede cambiarlo, y
  siempre hay al menos uno: quitarse a uno mismo el último rol de administrador se rechaza.

## Migration Plan

Dos entregas. La primera —empresa, rango con dueño, emisor congelado— es completa por sí sola y no
necesita usuarios. La segunda añade identidad y roles.

Al desplegar la primera hay que **crear la empresa** antes de emitir; sin ella, emitir falla con un
mensaje que lo dice, igual que sin rango. Los documentos emitidos no se migran. Los borradores toman
el emisor de la empresa la próxima vez que se guarden.

Marcha atrás de la primera entrega: inocua mientras no se haya emitido nada con emisor congelado.
De la segunda: devuelve la aplicación al operador del entorno, y los usuarios creados quedan sin uso
en la base.

## Open Questions

Ninguna.
