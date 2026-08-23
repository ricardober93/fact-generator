## Why

`inventory-app` planteaba mal el problema y por eso se quedó bloqueado. Describía **una aplicación
concreta** —Inventario— y daba por hecho que facturación consumiría su modelo de productos. Eso tiene
dos consecuencias malas y una imposible:

- Facturación acabaría conociendo el schema de otra app. El día que Inventario renombre un campo,
  facturación se rompe sin haber cambiado una línea.
- Solo habría **un** proveedor posible. Un catálogo en una hoja de cálculo, un ERP que ya existe o un
  CSV quedarían fuera aunque resuelvan lo mismo.
- Y su especificación no tenía dónde vivir: describir en este repositorio el interior de otra
  aplicación pone la fuente de verdad de un código en otro.

Lo que facturación necesita de verdad no es «productos». Es **algo con qué rellenar una línea**: un
texto, un precio y un impuesto. Ese es un contrato mucho más pequeño, y lo define quien lo consume.

## What Changes

- **El contrato lo define facturación, no el proveedor.** Un origen de catálogo es cualquier cosa que
  responda a dos preguntas: «búscame por texto» y «dame este». La respuesta trae exactamente lo que
  cabe en una línea: `ref`, `code`, `label`, `unitPrice`, `taxRate`. Nada más.
- **La referencia es opaca.** Facturación guarda `ref` y lo devuelve tal cual; **nunca** lo
  interpreta, ni lo parte, ni lo usa para construir una URL. Es lo que permite que el proveedor cambie
  de identificadores sin avisar a nadie.
- **El origen se configura, no se programa.** Una variable de entorno con la URL base. Sin ella, el
  selector no existe y la aplicación funciona exactamente como hoy: escribir las líneas a mano sigue
  siendo el camino normal, no un modo degradado.
- **La línea sigue congelando su texto.** Al emitir se congela lo que se pintó, como ya ocurre. La
  `ref` se guarda **además**, para poder contar ventas por producto más adelante.
- **Inventario deja de ser especial.** Pasa a ser _un_ proveedor que implementa el contrato, igual que
  podría hacerlo cualquier otra cosa. Su especificación vive en su repositorio, no en este.

## Capabilities

### New Capabilities

- `catalog-source`: el contrato que facturación pide a un origen de catálogo, la opacidad de la
  referencia, cómo se configura y qué pasa cuando el origen no está, tarda o miente.
- `invoice-line-catalog`: elegir un origen para una línea sin perder la escritura a mano, y qué queda
  guardado en la línea.

### Modified Capabilities

- `invoice-records`: una línea puede guardar la referencia opaca de su origen además de su texto. Lo
  que se congela al emitir no cambia.

## Impact

**Esto sí es trabajo de este repositorio**, al contrario que `inventory-app`. No describe ninguna otra
aplicación: describe lo que esta pide y cómo se comporta cuando no se lo dan.

**Código tocado**: un cliente HTTP nuevo bajo `src/catalog/`, el selector en la lista de líneas del
editor de facturas, y un campo más en la línea guardada.

**Sin dependencias npm nuevas**: `fetch` es nativo.

**Se puede construir y probar hoy, sin Inventario.** El contrato lo define el consumidor, así que las
pruebas levantan un proveedor de mentira y comprueban contra él. Si el día que exista Inventario no
encaja, el que se adapta es Inventario.

## Fuera de alcance

- **Sin especificar Inventario.** Es un proveedor entre otros y su interior no es asunto de este
  repositorio.
- **Sin existencias.** Facturación no lee stock ni lo descuenta: eso no cambió.
- **Sin caché ni sincronización local.** Si el origen no responde, se escribe a mano, que es lo que se
  hace hoy.
- **Sin escribir nada en el origen.** El contrato es de solo lectura, en un solo sentido.
- **Sin claves de aplicación por ahora.** El origen se declara por URL; cuando haya uno que exija
  autenticación, se le añade una cabecera configurable. No se diseña autenticación para un llamador
  que no existe.
- **Sin colas, eventos ni webhooks.** Nada de esto lo pide el volumen del brief.
