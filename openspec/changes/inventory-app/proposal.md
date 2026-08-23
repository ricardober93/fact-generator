## Why

El ecosistema que decidimos —apps independientes que se hablan por API— tiene hoy **una sola app**, y
una app sola no demuestra nada de esa decisión. La segunda pieza del brief es Inventario, y es la que
convierte «apps independientes» de intención en arquitectura comprobada: o el contrato entre las dos
funciona, o se descubre ahora y no con cuatro apps encima.

Hace falta además por una razón propia de facturación: hoy cada línea de una factura se teclea entera
—descripción, cantidad, precio—. No hay catálogo, así que el mismo producto se escribe distinto en dos
documentos, el precio se teclea mal sin que nada avise, y no se puede responder «cuánto vendí de esto»
porque no hay «esto», solo texto.

## What Changes

**Esta propuesta describe una aplicación que no vive en este repositorio.** Ver «Impacto» antes de
implementar nada.

- **App de Inventario**, independiente: su propio despliegue, su propia base de datos, su propia API.
- **Productos** como fuente de verdad: código, nombre, unidad de medida, precio, impuesto aplicable.
- **Existencias** por producto, movidas solo por Inventario y por el POS. Facturación **nunca**
  las toca, como se decidió.
- **API de consulta** con clave de aplicación: buscar productos, leer uno, leer su precio vigente.
- **En facturación, solo el lado cliente**: un selector de producto en la línea de la factura que
  rellena descripción, precio e impuesto. Escribir a mano sigue siendo posible —una factura manual por
  un servicio no tiene por qué existir en el catálogo—.
- **La línea congelada guarda el texto, no la referencia.** Al emitir se congela lo que se pintó; si
  mañana el producto cambia de nombre o de precio, los documentos entregados no se mueven. La
  referencia al producto se guarda **además**, para poder contar ventas.

## Capabilities

### New Capabilities

- `product-catalog`: el producto como fuente de verdad —qué lo identifica, qué se puede cambiar y qué
  pasa con los documentos ya emitidos cuando cambia—.
- `stock-levels`: existencias y sus movimientos, y quién puede moverlas.
- `inventory-api`: el contrato entre apps —autenticación por clave, versionado, qué se expone y qué
  no—.
- `invoice-line-catalog`: en facturación, elegir un producto para una línea sin perder la posibilidad
  de escribirla a mano.

### Modified Capabilities

- `invoice-records`: una línea puede referenciar un producto además de su texto; lo congelado al
  emitir sigue siendo el texto.

## Impact

**Aquí está la decisión que hay que tomar antes de escribir código, y no la tomo yo.** Este cambio
describe una app que, por la propia arquitectura que elegimos, **no puede vivir en `fact-generator`**:
tiene otro despliegue, otra base de datos y otro ciclo de vida. Tener su especificación dentro de este
repositorio pondría la fuente de verdad de un código en otro. Dos formas de arreglarlo:

1. **Un store de OpenSpec para el ecosistema** (`openspec store`), donde vivan las specs que cruzan
   apps —el contrato de la API, sobre todo— y que los dos repositorios referencien. Es lo que
   recomiendo: el contrato entre dos apps no pertenece a ninguna de las dos.
2. **Un repositorio nuevo** para Inventario con su propio `openspec/`, y en este repositorio solo el
   cambio pequeño del lado cliente (`invoice-line-catalog`).

Mientras no se decida, **este cambio no se implementa**: solo `invoice-line-catalog` es trabajo de
este repositorio, y depende de una API que todavía no existe.

**Orden sugerido**: primero `company-scoping` —una factura sin emisor estable no mejora porque sus
líneas tengan catálogo—, después el catálogo.

## Fuera de alcance

- **Sin POS.** Es la fase 3 y descuenta existencias; aquí solo se leen.
- **Sin compras, proveedores, ni costes.** Catálogo y existencias, no gestión de almacén.
- **Sin sincronización offline.** La app de facturación sigue siendo online-first, como se decidió.
- **Sin que facturación escriba nada en inventario.** Ni al emitir, ni al corregir, ni nunca: esa
  frontera es lo que mantiene las dos apps desacopladas.
- **Sin colas ni eventos.** API y ya; el volumen del brief no justifica otra cosa.
