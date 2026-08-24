## Context

Las dos piezas ya existen y no se tocan: la línea guarda una `ref` opaca desde `catalog-source`, y el
artículo tiene cantidad y libro desde `inventory-stock`. Lo único que falta es el momento en que una
cosa mueve la otra, y ese momento es la emisión, que es también el único acto irreversible del
sistema.

`Issuance.issueInvoice` ya resuelve solo dos problemas que aquí harían falta: se ejecuta bajo
`locker.withKey('invoice:<id>')`, y devuelve el documento tal cual si ya estaba emitido, antes de
tocar nada. Eso es exclusión mutua e idempotencia sin añadir una línea.

## Goals / Non-Goals

**Goals:**

- Que vender mueva existencias sin que el inventario pueda impedir una emisión.
- Que un descuento que no se pudo aplicar se vea, en vez de perderse.
- Que corregir una venta devuelva la mercancía.

**Non-Goals:**

- Reservas, comprobación previa de existencias, reintentos automáticos.
- Que Inventario sepa qué es una factura: recibe referencias y cantidades, no documentos.
- Valoración, costes o margen. Se mueven unidades.

## Decisions

### El descuento va detrás de `invoices.update`, dentro del mismo cerrojo

El orden es: comprobar aritmética, asignar número, `applyIssue`, **persistir**, y sólo entonces
consumir existencias. Dentro del cerrojo de la factura, para que dos emisiones simultáneas del mismo
borrador no se crucen.

Ponerlo antes de persistir era la alternativa, y es el orden de libro —lo reversible primero, lo
irreversible después, y si lo irreversible falla se compensa—. Se descarta porque aquí lo
irreversible es lo que el negocio no puede perder: un documento fiscal numerado. Si se descuenta
antes y la emisión falla, hay que devolver el stock; si la devolución también falla, queda un
descuadre sin documento que lo explique, que es peor que un descuadre con factura al lado.

### Un fallo al consumir no puede tumbar la emisión

El consumo va envuelto de modo que ninguna excepción suya se propague: la respuesta de
`issueInvoice` es la misma con o sin él. Lo que falla se escribe como consumo pendiente.

Es la regla del sistema aplicada una vez más: el conflicto de guardado y los rechazos de emisión ya
viajan como valor y no como excepción.

### El consumo pendiente no es un movimiento

Se guarda aparte, con la factura, la referencia, la cantidad y el motivo por el que no se aplicó.

Meterlo en el libro con una marca era más corto y rompe la invariante que `inventory-stock` acaba de
fijar: que la suma del libro explique la cantidad. Un registro que suma pero no se aplicó obliga a
filtrar en cada lectura, y el día que alguien olvide el filtro el número deja de cuadrar sin que
nadie lo note.

### Inventario recibe referencias, no líneas de factura

La capacidad que expone `inventory/app.ts` toma una empresa, una lista de `{ ref, cantidad }`, un
motivo y un autor. No recibe la factura, ni sus ítems, ni sabe qué es un documento.

Pasarle los ítems era más cómodo y le enseñaría el vocabulario de facturación —`total`, `precio`,
`ref`—, que es lo mismo que este proyecto ya evitó con la numeración cuando expuso «asígname un
número» en vez de `chooseRange`.

### Qué línea mueve y qué línea no

Mueve la línea que tiene `ref` que resuelve a un artículo de esa empresa **y** una cantidad
utilizable. Todo lo demás se salta en silencio y no es un error: línea escrita a mano, referencia de
un origen externo que no es ningún artículo nuestro, o plantilla que no declara columna de cantidad.

Suponer «uno» cuando no hay cantidad era la alternativa, y se descarta porque `checkArithmetic` ya
resolvió esta misma pregunta saltando las líneas sin cantidad en vez de adivinarla. Dos criterios
distintos para el mismo dato ausente es cómo empiezan los descuadres.

### La nota de crédito devuelve, con el mismo camino

Un documento que corrige mueve con el signo contrario. No hay un segundo mecanismo: la misma
capacidad, la misma línea de código, el signo lo decide el tipo de documento.

Sin esto, corregir una venta dejaría el stock descuadrado para siempre, y como anular no existe la
nota de crédito es el único sitio donde puede colgar la devolución.

## Risks / Trade-offs

- **El stock puede quedar en negativo** → es la decisión, no un defecto: en un mostrador la mercancía
  ya salió cuando cobras. El negativo es visible y se corrige con un ajuste a mano, que exige motivo.
- **Un consumo pendiente que nadie mire no sirve de nada** → va en pantalla propia y no en un log; sin
  reintento automático, la única forma de cerrarlo es que una persona ajuste, dejando su motivo.
- **Dos emisiones del mismo borrador a la vez** → el cerrojo de la factura ya las serializa, y la
  segunda encuentra el documento emitido y devuelve sin consumir.
- **Con origen externo no se mueve nada** → correcto y silencioso: las referencias son ajenas y no
  resuelven a ningún artículo. Se documenta para que no se lea como un fallo.

## Migration Plan

No hay datos que migrar. Las facturas ya emitidas antes de este cambio no generan movimientos hacia
atrás: el libro empieza cuando empieza, y una existencia que venía de antes se cuadra con un ajuste a
mano.

## Open Questions

- Un artículo borrado cuya referencia sigue en líneas guardadas: hoy el consumo simplemente no
  resuelve y se salta. Si eso resulta molesto, la respuesta no es impedir el borrado sino registrarlo
  como pendiente, y esa decisión se toma cuando alguien la pida.
