## Context

Ver `ARCHITECTURE.md` en la raíz para la estructura del proyecto, la frontera de
`invoice/render/` y las restricciones verificadas del framework. Este documento solo
cubre lo que este cambio decide por encima de eso.

El proyecto está vacío: `src/` contiene únicamente `_run_.ts`, `_cmd_.ts` y `css.d.ts`.
Este es el primer código de aplicación, así que no hay nada que migrar ni compatibilidad
que mantener.

## Goals / Non-Goals

**Goals:**

- Fijar la forma del documento de factura antes de que tres consumidores empiecen a
  depender de ella.
- Poder validar un documento en un test que no levante servidor ni base de datos.
- Que dos pestañas editando la misma plantilla no puedan pisarse en silencio.
- Guardar imágenes en la base de datos sin que eso degrade el listado de plantillas.

**Non-Goals:**

- Renderizar. No se produce HTML ni CSS en este cambio.
- Rutas HTTP, controladores y UI. Sin `@uiController` todavía.
- Resolución de conflictos en la interfaz: aquí solo se detecta el conflicto y se
  devuelve la información necesaria para resolverlo después.

## Decisions

### Los tipos del documento viven en `render/`, no en `models/`

`invoice/render/document.ts` contiene el tipo del documento, sus invariantes y
`validateDocument()`. La entidad `Template` lo importa desde ahí.

La dirección importa: el navegador necesita el tipo y la validación (el editor valida
mientras editas, antes de guardar), y `models/` es código de servidor que extiende
`Entity` desde la raíz del paquete. Si los tipos vivieran en `models/`, importarlos desde
un island arrastraría express al bundle. Al revés funciona: el servidor puede importar de
`render/` sin problema.

### La validación se escribe a mano, sin librería

Alternativas descartadas:

| Opción | Por qué no |
|---|---|
| `@isString`/`@isNumber` del framework | Viven en la raíz del paquete. `render/` no puede importarla. |
| zod / valibot | Dependencia nueva, y no resuelve la mitad del problema (ver abajo). |

El schema de un tipo de bloque tiene **doble uso**: valida el bloque *y* genera su panel
de propiedades en el editor. Por eso es un descriptor mínimo y legible
(`{ value: 'string', ecc: 'enum:L,M,Q,H' }`) del que se puede derivar tanto un chequeo
como un formulario. Un esquema de zod valida bien, pero introspeccionarlo para dibujar
inputs es peor que leer este objeto plano. Con un descriptor propio, el validador son unas
decenas de líneas y el generador de inspector sale gratis en el cambio siguiente.

### El bloqueo optimista se implementa con `Locker`, no con SQL condicional

El `rev` es la regla; queda decidir cómo se comprueba sin condición de carrera.

Alternativa descartada: un `@queryExtension()` con `UPDATE … WHERE data->>'rev' = $x`.
Obliga a escribir **dos** implementaciones —`@pgExtension` y `@memExtension`— de la misma
operación, y la de memoria acabaría simulando semántica de SQL.

Elegido: leer, comparar `rev` y escribir dentro de `locker.withKey(template).run(...)`.
El runner ya registra `PgLocker` (sobre `pg_advisory_lock`, seguro entre procesos) cuando
hay `DATABASE_URL`, e `InMemoryLocker` cuando no; y `Entity` ya implementa `ILockerKey`,
así que la entidad se pasa directamente. Una sola implementación, sin SQL, y la sección
crítica dura una lectura y una escritura.

### Los assets son inmutables y direccionados por contenido

El id de un asset es el SHA-256 de sus bytes (`node:crypto`, nativo). Subir el mismo logo
dos veces devuelve el mismo id y no crea una fila nueva.

Alternativa descartada: `Asset` con `templateId` y borrado en cascada. Obliga a decidir qué
pasa cuando se borra un bloque, cuando se duplica una plantilla y cuando dos plantillas
comparten logo — tres preguntas que con contenido direccionado **no existen**. El logo de
una empresa es exactamente lo que se comparte entre todas sus plantillas: una fila.

Lo que se acepta a cambio: nada se borra nunca. Ver riesgos.

### El tipo de imagen se determina por contenido

Se leen los magic bytes: PNG (`89 50 4E 47`), JPEG (`FF D8 FF`), WebP (`RIFF` + `WEBP` en
el byte 8). El tipo que declare el cliente se ignora por completo. Son unas quince líneas;
una librería de sniffing sería una dependencia nueva para eso.

SVG es la excepción: es texto y no tiene magic bytes. Se detecta textualmente. Ver riesgos.

### El límite de tamaño se aplica igualmente en el servidor

El cliente normaliza a 600 px con canvas antes de subir, y el `@action` corta a 100 kb de
body por su cuenta. Aun así el repositorio comprueba el tamaño: lo primero es una comodidad
del cliente y lo segundo un efecto colateral de la configuración del framework. Ninguna de
las dos es una regla del dominio, y ambas podrían cambiar sin que nadie recuerde esta.

## Risks / Trade-offs

**El SVG se detecta por texto, no por magic bytes** → No hay forma de hacerlo mejor: el
formato es XML. La defensa real no es la detección sino la regla de render: los assets
salen siempre como data URI para el `src` de un `<img>`, contexto en el que el navegador
no ejecuta los scripts del SVG. Si esa regla incomodara en el futuro, la salida correcta es
quitar SVG de la allowlist, no inlinear markup.

**Los assets nunca se borran** → Cada uno pesa decenas de kilobytes y están deduplicados
por contenido; un uso normal no llega a molestar. Si algún día molesta, un barrido que
cuente referencias es un cambio posterior y aislado. Construirlo ahora sería trabajo
especulativo.

**El conflicto de `rev` pierde el trabajo del segundo editor** → La respuesta de conflicto
devuelve la `rev` actual y el documento almacenado, que es lo que necesita el editor para
ofrecer una salida. Qué ofrece exactamente —descartar, forzar o fusionar— es decisión de
`template-builder`.

**El descriptor de schema propio se quedará corto** → Cubre lo que necesitan los cuatro
tipos iniciales. Cuando un tipo pida algo que no expresa, la salida es ampliar el
descriptor, que es un `switch` en un archivo, no cambiar de librería.

**Fijar el tipo del documento ahora congela a tres consumidores** → Es justamente el
motivo de hacerlo primero y solo. Cualquier cambio posterior de forma toca las tres
capabilities siguientes, así que conviene que el modelo esté escrito y probado antes de
que exista una sola línea que lo consuma.

## Migration Plan

Sin migración: es código nuevo en un proyecto sin datos. Dos tablas nuevas (`template`,
`asset`) creadas por el adaptador que elija el runner según `DATABASE_URL`. Sin
`DATABASE_URL` todo corre en memoria, que es como se ejecutan los tests.

Rollback: revertir el commit.

## Open Questions

- **Límite de tamaño de asset en el servidor.** Propuesta: **64 kb de bytes decodificados**.
  El techo del `@action` son 100 kb de *base64*, que equivalen a ~73 kb de bytes: un límite
  de dominio por encima de esa cifra sería letra muerta, porque el body se rechazaría antes
  de llegar al repositorio. 64 kb queda justo por debajo, y sigue siendo holgado frente a
  los ~13–53 kb que produce la normalización a 600 px.
- **Paginación en pantalla** (heredada, no la decide este cambio): por defecto papel
  continuo, el corte real solo en Ctrl+P. `paged.js` solo si se justifica.
