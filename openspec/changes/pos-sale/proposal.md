## Why

Con Inventario dando catálogo y la emisión moviendo existencias, lo único que falta para ver la
cadena entera es la superficie por la que se vende. Hoy la única forma de producir una factura es el
editor: un lienzo con plantilla, bandas y campos, pensado para componer un documento con calma. En un
mostrador con alguien esperando, eso no es una herramienta de venta.

El punto de venta es esa superficie: elegir del catálogo, ver el total, cobrar y que salga la factura.
No es un documento nuevo ni un dominio nuevo.

## What Changes

- **Una pantalla de venta**: buscar en el catálogo, añadir líneas, cambiar cantidades, ver el total, y
  un botón que cierra la venta.
- **Cerrar la venta emite.** No deja borrador: al cerrar, el documento queda emitido y numerado.
- **La venta ES una factura**, no una entidad nueva. El POS construye los mismos datos que construiría
  el editor y llama a lo que ya existe: crear el borrador y emitirlo, en un solo gesto.
- **El descuento de existencias sale gratis.** `stock-on-issue` engancha en la emisión, no en el
  editor, así que una venta del POS mueve stock sin que el POS sepa que el stock existe.
- **Cliente por defecto**: si la plantilla exige nombre de cliente, el POS lo rellena con «Consumidor
  final» y deja cambiarlo. Es lo que ocurre en el 95% de las ventas de mostrador.
- **El POS declara con qué plantilla emite.** Si esa plantilla exige campos que el POS no puede
  rellenar, la pantalla lo dice al abrirse y no deja vender, en vez de fallar al cerrar la venta con
  el cliente delante.
- **Rol de cajero.** Vender es exactamente lo que un cajero puede hacer; el POS es su pantalla.

## Capabilities

### New Capabilities

- `pos-sale`: la superficie de venta —qué se puede hacer en ella, qué produce al cerrar, y qué pasa
  cuando no puede producirlo—, y por qué lo que produce es una factura corriente y no un documento
  aparte.

### Modified Capabilities

Ninguna. El POS usa la creación y la emisión tal como están: no cambia qué es una factura, ni cómo se
emite, ni qué congela al emitirse. Es una superficie más sobre el mismo motor, como ya lo son el
editor y el embed.

## Impact

**Código nuevo**: `src/pos/` con su controlador, su pantalla y su `app.ts`. Un island para la búsqueda
y el recálculo del total, que es lo único que necesita ser interactivo.

**Código tocado**: ninguno de facturación. El POS llama a `InvoiceRepository.createInvoice` y a
`Issuance.issueInvoice` por la puerta que ya está abierta.

**Dirección**: `pos → invoice`, `pos → catalog`. No pasa por Inventario: el catálogo ya es la frontera
de lectura, y el stock se mueve solo desde la emisión.

**Sin dependencias npm nuevas.**

**Depende de `inventory-catalog`** para tener catálogo. `stock-on-issue` no es requisito para vender:
sin él la venta funciona y el stock no se mueve.

**Documentación**: `ARCHITECTURE.md` **y** `openspec/config.yaml`, los dos, con la superficie nueva y
la regla de que una venta no es un documento distinto.

## Fuera de alcance

- **Sin cobro.** Ni medios de pago, ni efectivo, ni vuelto, ni tarjeta. Se decidió el alcance en
  «vender y facturar», y el cobro es un dominio propio con su propia cuadratura.
- **Sin turno de caja.** Ni apertura, ni cierre, ni arqueo. Es lo mismo: dominio propio, y sin cobro
  no hay nada que arquear.
- **Sin descuentos ni promociones.** El precio sale del catálogo y se puede corregir a mano, que es lo
  que ya permite una línea.
- **Sin clientes como entidad.** El nombre del cliente es un dato del documento, como hoy. Un fichero
  de clientes es otra aplicación.
- **Sin devoluciones desde el POS.** Corregir una venta es una nota de crédito y ya tiene su camino en
  el editor; duplicarlo aquí sería un segundo sitio donde se decide lo mismo.
- **Sin impresión de tique.** Se imprime como todo lo demás: el documento emitido, con Ctrl+P.
- **No se reabre** que anular no exista, ni que el emitido congele sus datos: el POS emite por el
  mismo camino, así que hereda las dos cosas sin decir nada.
- **No se reabre** la opacidad de la `ref`: el POS la guarda en la línea y no la interpreta, igual que
  el editor.
