## Context

Ver `ARCHITECTURE.md` para la estructura y `openspec/specs/` para el modelo del documento,
su persistencia y el motor de render, que este cambio consume sin tocar.

Estado de partida: `render(input)` produce el marcado de una factura y lanza `MissingDataError`
si falta un dato obligatorio. `TemplateRepository` y `AssetRepository` existen. No hay ni un
solo `@uiController` en el proyecto: este es el primero.

## Goals / Non-Goals

**Goals:**

- Una ruta que un iframe pueda abrir y que devuelva la factura ya pintada.
- Que los datos lleguen sin pasar por la URL.
- Que ver e imprimir no dependan de JavaScript.
- Que el iframe se ajuste solo a su contenido.

**Non-Goals:**

- El editor. Este cambio no dibuja ninguna interfaz de edición.
- Autenticación. Se deja el hueco; ver riesgos.
- Tocar el motor de render.

## Decisions

### La entrega previa, y no `postMessage`, resuelve la entrada de datos

El padre entrega los datos por una acción de servidor y recibe un token; el iframe se abre
con el token. La alternativa era que el iframe cargara vacío y el padre le mandara los datos
por `postMessage`.

| | Entrega previa | `postMessage` |
|---|---|---|
| SSR | Completo | Esqueleto y luego repintado en cliente |
| Sin JavaScript | Funciona | Página vacía |
| Imprimir | Inmediato | Hay que esperar a los datos |
| Estado en servidor | Entidad con caducidad + limpieza | Ninguno |

Se elige la entrega previa porque el embed es un documento para imprimir, y un documento que
necesita JavaScript para existir es un documento que a veces no existe. El coste —una entidad
y un cron— es conocido y acotado.

### El handoff se puede leer varias veces dentro de su ventana

Al plantear la decisión se habló de un token de un solo uso. **Se descarta**: un iframe se
recarga al imprimir, al cambiar un parámetro y cada vez que alguien pulsa F5, y las tres
cosas romperían con un token consumible. La protección real es la ventana corta —10
minutos— más un identificador no adivinable, no la unicidad de la lectura.

### La validación ocurre al crear el handoff, no al pintarlo

`prepare` valida los datos contra el `dataSchema` de la plantilla y falla ahí si falta algo
obligatorio. Así el integrador recibe el error en su propia llamada, con las rutas ausentes,
en lugar de descubrirlo dentro de un iframe que ya está en la página de un cliente.

La ruta del embed conserva de todos modos su propio manejo de `MissingDataError`: la
validación previa no es una garantía si alguien crea handoffs por otra vía, y el motor es
quien tiene la última palabra.

### Solo se cargan los assets referenciados

El adaptador PG no proyecta columnas, así que un `findAll()` de assets traería todos los
base64 de la base para pintar un logo. El embed recorre los bloques de tipo `asset`, traduce
sus referencias a token, mira qué id guarda el tema para cada uno y pide **solo esos** por
id.

### La altura viaja por `postMessage`, y es una mejora, no un requisito

Un island mínimo observa el documento con `ResizeObserver` y publica su altura. Es el único
mecanismo posible: el padre no puede medir dentro de un iframe. Si el JavaScript no corre, la
factura se ve entera igual y solo se pierde el ajuste; por eso vive en un island y no en el
camino de render.

### El token se genera con `Random`, no con `Math.random()`

`Random.alphaNumeric` del framework usa `crypto.randomBytes`. El token es lo único que
protege los datos de una factura durante diez minutos, así que tiene que ser impredecible.

## Risks / Trade-offs

**La acción que crea handoffs quedaría sin proteger** → Es el riesgo serio de este cambio.
El proyecto no tiene autenticación todavía, y `prepare` es su primer endpoint de escritura
expuesto. Sin guardia, cualquiera que conozca un `templateId` puede crear un handoff y ver el
diseño de esa plantilla renderizado con datos propios.

Mitigación en este cambio: se deja el punto de enganche —la acción admite un
`@uiMiddleware`— y queda documentado como **bloqueante para producción**. No se inventa aquí
un esquema de autenticación, porque hacerlo a medias es peor que dejar el hueco señalado.
Lo que sí se hace: el embed no expone ninguna forma de listar plantillas ni tokens, de modo
que hay que conocer un `templateId` de antemano.

**Los datos de clientes se guardan en la base, aunque sea diez minutos** → Es inherente a la
decisión. El cron de limpieza los borra, pero entre la creación y el barrido están en disco.
Si algún día hay datos sensibles de verdad, la salida es cifrar el campo o mover el handoff a
un almacén en memoria, no alargar la caducidad.

**El cron de limpieza es la primera tarea periódica del proyecto** → Si falla en silencio, la
tabla crece sin que nadie se entere. `ICronHandler` admite `handleError`; conviene usarlo
para dejar rastro en el log en vez de tragarse el fallo.

**Diez minutos puede quedarse corto** → Si el padre genera el handoff en una página que el
usuario tarda en abrir, el iframe encontrará un token caducado. El caso se manifiesta como un
404 legible, no como una página rota, y el valor es una constante nombrada.

**Es el primer `@uiController` del proyecto** → El bundler de islands, el SSR y el pipeline de
vistas se estrenan aquí. Conviene esperar fricción de arranque que no tiene que ver con el
diseño sino con la primera puesta en marcha.

## Migration Plan

Sin migración de datos. Una tabla nueva (`handoff`) creada por el adaptador activo. Sin
`DATABASE_URL` todo corre en memoria, incluidos los tests.

El cron se registra solo al arrancar el runner; no hay que tocar `_run_.ts`.

Rollback: revertir el commit. No quedan datos que convertir.

## Open Questions

- **Quién puede llamar a `prepare`.** Bloqueante para producción, no para implementar este
  cambio. Las opciones cuando llegue el momento: una capability de autenticación con sesión,
  o restringir la acción a llamadas del propio proceso. Conviene decidirlo antes de exponer
  el servicio.
- **Origen permitido para el `postMessage` de la altura.** Se envía a `window.parent` con el
  origen del propio embed. Si algún día el padre vive en otro origen, habrá que declararlo;
  hoy la decisión cerrada es mismo origen.
