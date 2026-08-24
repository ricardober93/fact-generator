## Why

El selector de líneas por catálogo está construido y probado, pero no tiene contra qué hablar:
`CATALOG_URL` no apunta a ninguna parte. `catalog-source` resolvió bien el contrato y dejó al
proveedor fuera —«Inventario deja de ser especial, su especificación vive en su repositorio»—, sólo
que ese repositorio nunca existió: `openspec store list` devuelve cero stores. La app que tenía que
dar el catálogo no se construyó porque no tenía dónde construirse.

Se revierte esa parte, con decisión explícita: Inventario nace como **módulo hermano en este repo**,
hablando por el contrato que ya existe. Lo respalda §5 —sacar un módulo a su propio despliegue es un
cambio de transporte, no un rediseño—, así que la frontera se escribe hoy y la separación, si llega,
no cuesta un rediseño.

## What Changes

- **Un módulo `inventory` hermano de los demás**, con su `app.ts` declarando qué expone. Lo que no
  esté ahí no existe para el resto, como con numeración.
- **El artículo**: código, nombre, precio unitario e impuesto. Nada más. Son exactamente los campos
  que el contrato `catalog-source` pide, más el código con el que una persona lo busca.
- **Las existencias**, por artículo, con ajuste manual que **exige motivo**. Un ajuste sin motivo es
  un descuadre que nadie podrá explicar tres meses después.
- **Alcance por empresa como parámetro obligatorio**, nunca inyección: `@repository` aplica
  `singleton()`, así que un repositorio con la sesión dentro se quedaría con la empresa del primer
  visitante. Olvidar el parámetro no compila.
- **BREAKING para `catalog-source`**: el origen deja de ser necesariamente HTTP. `CatalogSource` pasa
  de clase única a **interfaz con dos implementaciones** —la HTTP que ya existe con `CATALOG_URL`, y
  una local respaldada por el repositorio de artículos—. Es el disparador que pide §7: _«se añade la
  interfaz cuando aparezca la segunda»_.
- **Sin `CATALOG_URL` el selector ya no desaparece**, si hay inventario. Lo que decide si se ofrece
  elegir del catálogo pasa a ser «hay un origen disponible», no «hay una variable puesta».
- **Pantalla propia**, con la forma de la de rangos y la de empresa: formulario normal, sin island.
- **Roles**: administrador da de alta artículos y ajusta existencias; cajero y lectura consultan.

## Capabilities

### New Capabilities

- `inventory-articles`: qué es un artículo, qué campos lleva, cómo se busca, y por qué son los mismos
  cinco que cabe en una línea de factura y no cuarenta.
- `inventory-stock`: las existencias de un artículo, el ajuste manual con motivo, y qué se guarda de
  cada movimiento para que un descuadre se pueda explicar.

### Modified Capabilities

- `catalog-source`: el origen deja de declararse necesariamente con una variable de entorno. El
  contrato —dos preguntas, cinco campos, referencia opaca— no cambia ni una coma; lo que cambia es
  que puede haber una implementación en proceso, y que «sin variable» ya no implica «sin selector».

## Impact

**Código nuevo**: `src/inventory/` con su entidad, su repositorio, su controlador de UI y su `app.ts`.

**Código tocado**: `src/catalog/` pasa a declarar la interfaz y a quedarse con la implementación HTTP
al lado de la local. El selector del editor de facturas no cambia de forma: cambia de quién le
responde.

**Sin dependencias npm nuevas.**

**Documentación**: `ARCHITECTURE.md` **y** `openspec/config.yaml`. Son dos archivos y el briefing que
se inyecta en cada artefacto es el segundo; tocar sólo el primero ya dejó atrás la arquitectura una
vez. Hay que reescribir la decisión de que Inventario viva en otro repositorio y la de que el origen
sea siempre una URL configurada.

## Fuera de alcance

- **Descontar existencias al emitir.** Es el cambio 2, `stock-on-issue`, y es asunto de la frontera
  facturador↔inventario, no del inventario solo: si emitir descuenta, también descuenta una factura
  escrita a mano. Aquí el stock sólo se mueve a mano.
- **El punto de venta.** Es el cambio 3, `pos-sale`.
- **Escribir en un origen HTTP externo.** El contrato hacia fuera sigue siendo de sólo lectura y en un
  solo sentido. Lo que se abre aquí es una implementación local, no una dirección nueva.
- **Sin costes, proveedores, ubicaciones, lotes, caducidades ni entradas de compra.** Ninguna de esas
  cosas cabe en una línea de factura, que es lo que este catálogo alimenta.
- **Sin reservas de stock.** No hay estado intermedio ni caducidad: se decidió que la factura manda y
  el descuento va detrás, así que no hay nada que reservar.
- **Sin sincronización ni caché.** Un origen local no tiene latencia que esconder.
- **No se reabre** que el documento emitido congele su texto y su precio: la `ref` se guarda además,
  nunca en lugar de los valores. Cambiar un artículo del catálogo no toca un documento ya emitido, y
  este cambio no da ninguna vía nueva para que lo haga.
- **No se reabre** la opacidad de la referencia: sigue sin interpretarse, partirse ni usarse para
  construir una URL, tampoco ahora que quien la emite está en el mismo proceso.
