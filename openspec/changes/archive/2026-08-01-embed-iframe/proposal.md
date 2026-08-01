## Why

El motor de render existe pero nadie lo llama. `embed-iframe` es la primera superficie del
producto: la ruta que convierte una plantilla guardada y unos datos en una página que un
iframe puede mostrar e imprimir.

Es también donde se resuelve la pregunta que ningún cambio anterior contestó: **por dónde
entran los datos de la factura**. No pueden ir en el query string —decisión cerrada— y
`render()` lanza si falta un dato obligatorio, así que el SSR no puede pintar nada sin
ellos. Sin una respuesta, el embed no existe.

## What Changes

- **Entrega previa de datos (handoff)**: el servidor del producto padre deja los datos con
  una acción y recibe a cambio un token opaco. El iframe lleva solo ese token en la URL.
  Los datos nunca aparecen en la URL, ni en los logs de un proxy, ni en el `Referer`.
- **Entidad `Handoff`** con caducidad: guarda `templateId`, `data`, `items` y `params`, y
  expira a los 10 minutos.
- **Ruta del embed** `GET /embed/:token`: carga el handoff y su plantilla, resuelve los
  assets, llama a `render()` y devuelve el documento server-renderizado. Sin JavaScript
  necesario para ver o imprimir la factura.
- **Validación de parámetros**: los parámetros de la URL se validan contra el schema
  `params` que declara la propia plantilla. Un parámetro no declarado se ignora.
- **Resolución de assets**: se cargan solo los assets que la plantilla referencia, y se
  entregan al render como data URIs.
- **Auto-resize**: un island mínimo observa el alto del documento y se lo comunica al padre
  por `postMessage`, que es el único modo de que el padre sepa cuánto mide el contenido.
- **Errores accionables**: si falta un dato obligatorio, el embed pinta un aviso legible que
  nombra las rutas ausentes en vez de una página en blanco.
- **Limpieza**: un cron diario borra los handoffs caducados.
- **Sin dependencias npm nuevas.**

## Capabilities

### New Capabilities

- `invoice-embed`: la superficie embebible. Cómo se entregan los datos antes de abrir el
  iframe, qué hace la ruta del embed con el token, cómo se validan los parámetros, cómo se
  resuelven los assets, qué se ve cuando algo falta y cómo el iframe comunica su altura.

- `invoice-handoff`: el almacén temporal de datos entre el padre y el embed. Qué se guarda,
  cuánto vive, quién puede leerlo, qué pasa cuando caduca y cómo se limpia.

### Modified Capabilities

Ninguna. El motor de render y el modelo del documento se consumen tal como están.

## Impact

**Código nuevo**:

```
src/invoice/EmbedController.tsx              @uiController('/embed')
src/invoice/models/handoff/Handoff.ts        + HandoffRepository.ts
src/invoice/models/handoff/ExpireHandoffs.ts @cronHandler diario
src/invoice/ui/EmbedFrame.island.tsx         auto-resize por postMessage
src/invoice/ui/embedAssets.ts                plantilla → assets como data URI
```

**Dependencias**: ninguna nueva.

**Persistencia**: una tabla nueva (`handoff`). Es la primera entidad del proyecto pensada
para caducar, así que estrena el `@cronHandler` de limpieza.

**Seguridad**: la acción que crea handoffs es el primer endpoint de escritura expuesto del
proyecto y **hoy quedaría sin proteger**, porque el proyecto todavía no tiene autenticación.
Ver `design.md`: se deja el punto de enganche del middleware y se documenta como bloqueante
para producción.

**Aguas abajo**: `template-builder` reutiliza la resolución de assets y el mismo `render()`,
pero no depende de este cambio; las dos superficies pueden construirse en paralelo.

## Fuera de alcance

Este cambio **no reabre** ninguna decisión cerrada, y en concreto:

- **No se toca el motor de render.** `render()` se consume tal cual; si hiciera falta
  cambiarlo, es señal de que algo se diseñó mal antes.
- **No hay editor, ni drag-and-drop, ni inspector.** Eso es `template-builder`.
- **El embed NO se marca `@view({ static })`.** Una vista estática se salta los
  middlewares, así que jamás puede servir un documento con datos de un cliente.
- **Los datos siguen sin viajar en el query string.** En la URL solo va un token opaco.
- **No hay PDF de servidor**: el único PDF sigue siendo Ctrl+P.
- **No hay multi-tenant, ni API keys, ni tokens firmados.** El handoff es un identificador
  opaco de vida corta, no una credencial firmada.
- **No se construye un sistema de autenticación** en este cambio: se deja el hueco y se
  documenta.
- **Sigue sin haber dominio fiscal.**
- **Sin paginación en pantalla**: papel continuo, corte real en Ctrl+P.
