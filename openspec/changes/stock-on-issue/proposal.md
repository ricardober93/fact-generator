## Why

`inventory-catalog` deja un catálogo con existencias que sólo se mueven a mano. Vender no las mueve,
así que el número es una declaración de intenciones desde el segundo día. Este cambio conecta las dos
cosas que ya existen: la línea guarda una referencia opaca desde `catalog-source`, y el artículo
tiene una cantidad desde `inventory-stock`.

Es la frontera facturador↔inventario y no el punto de venta, por eso va antes y separado: si emitir
descuenta, entonces **toda** emisión descuenta, también una factura escrita a mano en el editor.
Metido dentro del POS quedaría en la app equivocada y facturar a mano no movería nada.

**Depende de `inventory-catalog`** —usa su artículo, su cantidad y su libro—, pero **no modifica
ninguno de sus requisitos**: todo lo que añade es aditivo, así que no hay delta cruzado contra un
spec sin archivar.

## What Changes

- **Emitir descuenta.** Por cada línea con referencia que resuelva a un artículo de la empresa, un
  movimiento negativo por su cantidad, con la factura como motivo y quien emite como autor.
- **La nota de crédito devuelve.** Mismo camino con el signo cambiado: la mercancía de una corrección
  vuelve al almacén. Sin esto, corregir una venta dejaría el stock permanentemente descuadrado.
- **Lo que no se toca no se adivina.** Una línea sin referencia, o con referencia que no resuelve, o
  sin cantidad utilizable, no mueve nada y no es un error. Es el mismo criterio que ya aplica
  `checkArithmetic`, que salta las líneas sin cantidad en vez de suponer que es uno.
- **El stock nunca bloquea una emisión.** Se permite quedar en negativo. En un mostrador la mercancía
  ya salió de la estantería cuando cobras: un dato de inventario equivocado no puede impedir
  facturar lo que el cliente tiene en la mano.
- **Si el descuento falla, la factura queda emitida igual** y queda un **consumo pendiente**
  visible, con lo que se intentó y por qué no pudo. Deliberadamente NO es un movimiento: nada se
  movió, y meterlo en el libro rompería que la suma del libro explique la cantidad. Sin reintento
  automático, sin cola.
- **La idempotencia no necesita clave.** `issueInvoice` ya devuelve el documento tal cual si estaba
  emitido, antes de tocar nada, y todo ocurre bajo el cerrojo de la factura. Reemitir no puede
  descontar dos veces, que es exactamente la decisión cerrada de que la idempotencia sea la
  identidad del borrador.
- **El permiso lo da la operación, no el ajuste.** Un cajero que emite mueve existencias sin ser
  administrador, y eso ya lo contempla `inventory-stock`, que acota su requisito de rol al ajuste
  **a mano**. Vender lo autoriza vender.

## Capabilities

### New Capabilities

- `stock-on-issue`: cuándo una emisión mueve existencias, qué líneas se saltan y por qué, qué signo
  lleva una nota de crédito, y qué queda escrito cuando el movimiento no se puede aplicar.

### Modified Capabilities

Ninguna. Los movimientos que nacen de una emisión encajan en lo que `inventory-stock` ya exige —todo
cambio de la cantidad deja un movimiento, con su autor y su instante— y el consumo pendiente es una
entidad aparte, precisamente para no tocar la invariante de que el libro explique la cantidad.

## Impact

**Código tocado**: `Issuance.assign`, justo después de `invoices.update(invoice)`, que es el punto en
que el documento ya es durable e inmutable. El descuento va detrás de esa línea y su fallo no puede
deshacerla.

**Código nuevo**: la capacidad de consumo en `inventory/app.ts` —«consume estas referencias»,
escrita para quien la consume y no como acceso a la cantidad—, y una vista de movimientos pendientes.

**Dirección**: `invoice → inventory`, la misma que `invoice → numbering`. No pasa por `catalog`:
aquélla es la frontera de lectura y sigue siendo de un solo sentido.

**Sin dependencias npm nuevas.**

**Documentación**: `ARCHITECTURE.md` **y** `openspec/config.yaml`, los dos, con la regla nueva de que
lo irreversible no depende de lo reversible.

## Fuera de alcance

- **Sin reservas.** Se decidió que la factura manda, así que no hay estado intermedio que reservar ni
  caducidad que vigilar.
- **Sin comprobar existencias antes de vender.** No hay pregunta «¿hay suficiente?» en ninguna parte:
  añadirla convertiría el stock en control y ya se decidió que es información.
- **Sin reintento automático, sin colas, eventos ni webhooks.** Un movimiento pendiente es un
  registro que alguien mira, no un trabajo que el sistema reintenta solo.
- **Sin escribir en un origen externo.** El contrato de `catalog-source` sigue siendo de sólo lectura
  y en un solo sentido. Con `CATALOG_URL` puesta no hay catálogo local, las referencias son ajenas y
  no resuelven a ningún artículo: no se mueve nada, que es lo correcto.
- **Sin costes, valoración ni margen.** Descontar unidades no es contabilizar inventario.
- **No se reabre** que anular no exista: una venta se corrige con nota de crédito, y por eso la
  devolución de stock cuelga de ella y no de un botón.
- **No se reabre** que el documento emitido sea inmutable: el movimiento de stock no forma parte del
  documento, no se congela con él y no cambia lo que se imprime.
