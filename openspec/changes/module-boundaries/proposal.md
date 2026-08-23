## Why

Merece la pena empezar por lo que **no** hay que replantear, porque es medible. Esta sesión añadió
emisión, numeración, notas de crédito, congelación, dos pantallas y su interfaz. En todo eso,
`render/` cambió **una palabra** —un `export` delante de `toCents`— y el registro de bloques,
`document.ts` y `render.tsx` quedaron idénticos byte a byte.

La frontera isomorfa y el registro de bloques absorbieron el crecimiento sin enterarse. No se tocan.

Lo que sí se ha desajustado es el envoltorio, y hay tres señales con número:

- **`InvoiceController.tsx` tiene 269 líneas** y el límite del proyecto son 250. Es una regla rota
  hoy, no una previsión.
- **`InvoiceRepository` inyecta tres colaboradores** —plantillas, rangos y `Locker`— y orquesta
  bloqueos, aritmética y consumo de consecutivos. Eso ya no es un repositorio: es un servicio de
  dominio con el nombre equivocado. Y con `company-scoping` y `catalog-source` encima pasa de 231
  líneas a más de 250.
- **`src/invoice/` son 150 de los 170 archivos del proyecto.** El eje de crecimiento que declara
  ARCHITECTURE.md —«una feature nueva es una carpeta hermana de `invoice/`»— no se ha usado ni una
  vez: la numeración, los tipos de documento y la aritmética acabaron dentro de facturas porque
  facturas era el único sitio que había.

Y hay un momento: las dos propuestas en cola tocan **exactamente** estos archivos. Reordenar antes
cuesta un rato; reordenar después cuesta dos veces.

## What Changes

- **`InvoiceController` baja de las 250 líneas** sacando lo que no es una ruta: los DTO, la clave de
  versión y los ayudantes de error a sus propios archivos. Sin cambiar ninguna ruta ni ninguna firma.
- **La emisión pasa a ser un servicio de dominio.** `Issuance` coordina factura, rango, aritmética y
  bloqueo; `InvoiceRepository` vuelve a ser persistencia y consultas. Se matiza la decisión cerrada de
  ARCHITECTURE.md §5: sigue prohibida la capa de servicios que **reenvía** al repositorio; deja de
  estarlo el servicio que **orquesta varios** agregados, que es un caso que aquella regla no
  contemplaba.
- **La numeración sale a `src/numbering/`**, como módulo hermano. Y deja de saber qué es una factura:
  un rango numera una **serie identificada por una clave que no interpreta**, igual que una referencia
  de catálogo es opaca. `docType: 'factura' | 'notaCredito'` pasa a ser `series: string`, y quien la
  usa decide qué significa.
- **Queda escrito el patrón de módulo**, para que `company/` y `catalog/` nazcan iguales en vez de
  cada uno a su manera.

## Capabilities

### Modified Capabilities

- `invoice-numbering`: un rango numera una serie identificada por una clave opaca en vez de un tipo de
  documento cerrado. El comportamiento observable no cambia —facturas y notas de crédito siguen
  numerándose por separado—; lo que cambia es que la numeración deja de conocer el vocabulario de
  facturación, y por eso podrá numerar remisiones o recibos sin tocarse.

## Impact

**Sin cambios de comportamiento**, salvo el renombrado de un campo. Ninguna ruta, ninguna pantalla y
ningún dato guardado cambian de forma para quien los usa.

**Datos existentes**: los rangos guardados tienen `docType`; se leen como `series` con el mismo valor,
sin migración, igual que se resolvieron `rev`, `estado` y `docType` en su día.

**Código movido**: `models/numberRange/` → `src/numbering/`; la emisión de `InvoiceRepository` →
`invoice/Issuance.ts`; DTO, clave de versión y ayudantes de `InvoiceController.tsx` → archivos
hermanos.

**Se hace antes que `company-scoping` y `catalog-source`**, no después: las dos aterrizan en estos
mismos archivos.

## Fuera de alcance

- **No se toca `render/`.** Ni la frontera isomorfa, ni el registro de bloques, ni el modelo del
  documento, ni los milímetros, ni las referencias a token. Es la parte que ha demostrado aguantar.
- **Sin `shared/`, sin barrels, sin monorepo, sin paquetes.** Módulos hermanos en `src/`, que es lo que
  ARCHITECTURE.md ya declaraba y nunca se usó.
- **Sin event bus, sin CQRS, sin interfaces de una sola implementación.** Nada de eso resuelve ninguna
  de las tres señales.
- **Sin tocar la interfaz.** El editor, el embed y el listado se quedan como están.
- **Sin dependencias npm nuevas.**
