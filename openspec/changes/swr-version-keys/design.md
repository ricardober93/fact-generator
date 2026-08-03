## Context

Ver `proposal.md` para el porqué y `specs/boosted-nav-cache/spec.md` para el qué. Aquí solo va
el cómo.

Lo que hace el framework, verificado leyendo el paquete instalado
(`feature/ui-controller/runUiControllers.js`), no la documentación:

```js
if (softNav && view.config?.swr?.version) {
  const version = await view.config.swr.version(buildRequest(req))
  versionEtag = `"v:${version}"`
  res.set('ETag', versionEtag)
  if (req.get('If-None-Match') === versionEtag) { res.status(304).end(); return }
}
const built = await produce(requestContainer, req, softNav)
if (softNav) {
  const etag = versionEtag ?? built.etag      // ← la clave del asunto
  ...
}
```

Tres hechos que mandan sobre todo el diseño:

| Hecho                                                                       | Consecuencia                                                                   |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `version` solo corre en navegación boosted (cabecera `X-Wabot-Nav`)         | Una recarga completa (F5) siempre pinta de verdad; el bug solo se ve navegando |
| `buildRequest(req)` = `{...body, ...query, ...params}`                      | La función recibe los parámetros de ruta, y puede ser `async`                  |
| Con `version` declarada, `etag = versionEtag`, **no** el hash del contenido | Una clave incompleta sirve contenido viejo, y nada lo corrige después          |

El tercero es el que convierte esto de una optimización en una cuestión de corrección. Sin
`version`, el framework hace lo lento pero seguro: pinta, hashea el resultado y compara. Con
`version`, le estamos diciendo «confía en esta cadena». Si mentimos, se queda con lo viejo.

**Estado actual**, leído del código:

- `/templates/:id` declara `swr: { version: revisionOf }`, y `revisionOf` devuelve
  `String(template.rev)`. Pero la vista pinta `assetChoices(await this.assets.findAll())`: la
  lista de imágenes disponibles. Subir una imagen no toca `template.rev` → el editor no se
  entera. **Bug presente en el código y silencioso, pero hoy inalcanzable**: ningún controlador
  llama a `AssetRepository.upload()`, así que no hay ruta que cree una `Asset` y el selector
  siempre se pinta vacío. Se arregla ahora porque cuesta una línea y porque el día que se
  conecte la subida el fallo ya estaría en marcha.
- `/invoices/:id` no declara nada → correcto pero caro, y con aviso al arrancar.

**Qué lee de verdad cada página** (esto es el corazón del diseño):

| Vista            | Entradas que acaban en el HTML                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `/invoices/:id`  | factura (`data`, `items`, `params`, `templateId`), `template.doc`, imágenes que cita el doc, y la **lista de plantillas** del selector |
| `/templates/:id` | `template.doc`, `template.rev`, imágenes que cita el doc, y la **lista de imágenes** del selector                                      |

Dos simplificaciones que salen del propio modelo y que abaratan mucho el problema:

1. **Las imágenes son inmutables y direccionadas por contenido.** `AssetRepository.store`
   hashea los bytes con sha256, deduplica por `contentHash` y solo crea; no hay ninguna ruta
   que modifique una `Asset` existente. Por tanto el contenido de un id nunca cambia: para
   `assetsFor(doc)` basta con que la clave recoja el `doc`.
2. **El nombre de una plantilla no se edita.** `TemplateController` solo expone `create` y
   `save`, y `save` solo toca `doc`. La lista del selector solo cambia al crear una plantilla.

## Goals / Non-Goals

**Goals:**

- Que `/invoices/:id` revalide sin volver a pintar, y que el aviso de arranque desaparezca.
- Que ninguna de las dos vistas pueda servir un fragmento viejo.
- Cero dependencias npm nuevas y cero cambios en el modelo de datos.

**Non-Goals:**

- Bloqueo optimista para facturas. Ver "Fuera de alcance" en `proposal.md`.
- Cachear en el servidor. La caché de la que hablamos vive en el cliente.
- Tocar `/invoices` o `/templates` (los índices): no son parametrizados y el framework no
  avisa de ellos.

## Decisions

### 1. La versión es un hash del contenido, no un contador de revisión

**Elegido**: leer lo que la página va a pintar y hashearlo con `node:crypto`.

**Alternativa descartada — añadir `rev` a `Invoice`**, replicando lo que ya hace `Template`.
Es la opción que parece obvia porque el patrón ya existe en el proyecto, y es la que se
descarta con más ganas:

- Un contador hay que **acordarse de incrementarlo**. `saveInvoice` hace `applyChanges` +
  `update`; el día que aparezca una segunda ruta de escritura que no lo incremente, la clave
  miente y la página se queda vieja. El fallo es silencioso y aparece semanas después.
- Un hash del contenido **no puede dar un falso acierto**. Si el contenido cambió, el hash
  cambia, sin que nadie tenga que acordarse de nada.
- Además obliga a decidir qué hacer con las filas que ya existen sin `rev`.

La dirección del error importa: un hash puede dar un falso **fallo** (por ejemplo si
`JSON.stringify` ordena las claves distinto entre dos lecturas), y un falso fallo solo cuesta
un render de más. Un contador olvidado da un falso **acierto**, que es contenido viejo en
pantalla. Se elige la herramienta que solo puede equivocarse hacia el lado barato.

El proyecto ya usa exactamente este recurso: `AssetRepository` deduplica por
`createHash('sha256')` sobre los bytes.

### 2. La clave recoge de más antes que de menos

Regla para las dos vistas: **si algo aparece en el HTML, entra en la clave.** No se optimiza
recortando entradas «que casi nunca cambian» — ese es justo el razonamiento que dejó
`/templates/:id` sin las imágenes.

```
/invoices/:id   → hash(factura.data + items + params + templateId
                       + template.doc + template.rev
                       + [id, nombre] de cada plantilla del selector)

/templates/:id  → hash(template.rev + [id] de cada imagen disponible)
```

En `/templates/:id` basta con los **ids** de las imágenes, no su contenido, precisamente por la
inmutabilidad de la decisión 1 del contexto: un id nuevo significa contenido nuevo, y un id
existente nunca cambia de bytes. Meter los base64 en el hash sería leer megabytes para nada.

**Alternativa descartada — contar las imágenes** en vez de listar sus ids. Un contador vuelve
a ser correcto solo mientras nadie pueda borrar; la lista de ids sigue siendo correcta si algún
día se borra, y cuesta lo mismo de leer.

### 3. La versión se calcula leyendo, no adivinando

`version(request)` recibe los parámetros de ruta y resuelve los repositorios por el
`container`, igual que ya hace `revisionOf` hoy. Sigue siendo más barato que el handler: lee lo
mismo pero **no** resuelve los data-URI de las imágenes (`assetsFor`), no calcula `dataFit` y,
sobre todo, no hace SSR del island con el documento entero. Ese SSR es el gasto que el cambio
elimina.

**Techo conocido**: cuando la vista sí ha cambiado, ahora se paga la lectura dos veces —una en
`version` y otra en el handler—. Es el peor caso y es el caso raro: se navega a un documento
mucho más a menudo de lo que se edita. La vía de subida, si alguna vez molesta, es memorizar la
lectura por petición; no hace falta anticiparla.

### 4. Una prueba por vista, y prueba la invalidación, no el formato

La prueba que vale no es «`version` devuelve una cadena». Es: **tomo la versión, cambio una
cosa que la página pinta, y la versión tiene que ser distinta.** Una tabla de casos por cada
entrada de la clave:

| Vista            | Cambio                                     | La versión debe         |
| ---------------- | ------------------------------------------ | ----------------------- |
| `/invoices/:id`  | se guardan datos distintos en la factura   | cambiar                 |
| `/invoices/:id`  | se edita el documento de su plantilla      | cambiar                 |
| `/invoices/:id`  | se crea otra plantilla (entra al selector) | cambiar                 |
| `/invoices/:id`  | no cambia nada                             | **no** cambiar          |
| `/templates/:id` | se edita el documento                      | cambiar                 |
| `/templates/:id` | se sube una imagen nueva                   | cambiar ← el bug de hoy |
| `/templates/:id` | no cambia nada                             | **no** cambiar          |

El caso «no cambia nada → no cambia» es el que protege el beneficio: sin él, una clave que
devolviera `Math.random()` pasaría todo lo demás y no ahorraría ni un render.

Estas pruebas son unitarias sobre la función de versión con `useMemoryRepositories()`: no
necesitan harness ni servidor.

### 5. Que el aviso no vuelva, comprobado por una prueba

El aviso del framework es la única señal automática de que una vista parametrizada de un
controlador `app: true` se quedó sin clave. Es fácil añadir mañana una vista nueva y no leer el
arranque.

Se añade una prueba que recorre las vistas registradas de ambos controladores por el
`UiControllerMetadataStore` —el mismo camino que ya usa `AuthController.unit.test.ts` para
comprobar que la vista de acceso no es `static`— y exige que toda vista parametrizada declare
`swr.version`. Así la regla se defiende sola cuando aparezca la siguiente ruta con `:id`.

### 6. Sin dependencias npm nuevas

Regla del proyecto: justificar cada dependencia contra la alternativa nativa. **No hay
ninguna.** `createHash` viene de `node:crypto`, que ya se usa en `AssetRepository`.
`package.json` no se toca.

## Risks / Trade-offs

- **Una clave incompleta no falla ruidosamente: sirve contenido viejo** → es el riesgo central
  del cambio. Mitigación en tres capas: la regla de la decisión 2 (si se pinta, entra), la
  tabla de pruebas de invalidación de la decisión 4, y la prueba estructural de la decisión 5
  para las vistas futuras.
- **Se paga la lectura dos veces cuando la página sí cambió** → ver el techo de la decisión 3.
  Es el caso raro y el de menor coste relativo.
- **`JSON.stringify` no garantiza el orden de las claves** entre dos lecturas → puede producir
  un hash distinto sin que nada haya cambiado, y eso solo cuesta un render de más. Se acepta
  conscientemente: el error cae del lado barato (decisión 1). No se añade un serializador
  ordenado para evitar un problema que solo cuesta trabajo de sobra.
- **La corrección de `/templates/:id` cambia el comportamiento observado** → hasta hoy el
  editor no se enteraba de una imagen nueva; a partir de ahora sí. Es el arreglo, pero conviene
  nombrarlo: si alguien había dado por buena la pantalla vieja, ahora se refresca.
- **El hash se calcula dentro de la petición autenticada** → no expone nada: la versión viaja
  como `ETag`, y de una cadena hexadecimal no se reconstruye ni la factura ni el documento.

## Migration Plan

1. Desplegar. No hay migración de datos: ninguna entidad cambia, ninguna columna se añade,
   ninguna variable de entorno nueva.
2. Los `ETag` que los navegadores tengan guardados de antes eran hashes de contenido; los
   nuevos empiezan por `v:`. No coinciden, así que la primera navegación tras el despliegue
   pinta de verdad y a partir de ahí revalida barato. No hay que purgar nada.

**Vuelta atrás**: quitar `swr` del `@view` de `/invoices/:id` devuelve el comportamiento
anterior —correcto y caro— sin tocar datos. Revertir el arreglo de `revisionOf` devuelve
también el bug; si hay que revertir, es preferible dejar ese trozo puesto.

## Open Questions

Ninguna que bloquee.

La que aparecerá el día que una plantilla se pueda **renombrar o borrar**: la clave de
`/invoices/:id` ya recoge `[id, nombre]` de cada plantilla, así que el renombrado está cubierto
por construcción; el borrado también, porque la lista se acorta. Se deja anotado aquí para que
quien añada esas rutas sepa que no tiene que volver a tocar esto.
