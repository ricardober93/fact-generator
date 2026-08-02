## Context

El motor y el editor están hechos; lo que falta es el registro y su superficie. El punto de partida,
verificado en el código:

- `models/` tiene `template`, `asset` y `handoff`. **No hay factura.**
- `Handoff` guarda `{ token, templateId, data, items, params, expiresAt }` con `HANDOFF_TTL_MS` de
  diez minutos y un cron que lo expira.
- `render()` es isomorfo y ya corre en el navegador: es lo que pinta el lienzo del editor.
- `sampleDataFor()` recorre el `dataSchema` para fabricar la vista previa, y ya separa los caminos de
  ítem de los demás con `isItemPath`.
- `missingRequiredPaths(doc, data, items, itemRoot)` devuelve los caminos obligatorios que faltan.
- Los cinco presets comparten `INVOICE_DATA_SCHEMA`: 23 caminos, 6 obligatorios.
- `pageCss` emite `@page`, colores exactos al imprimir y el pie fijo; `documentCss` el alternado de
  filas.

El resto del contexto arquitectónico está en ARCHITECTURE.md y no se repite aquí.

## Goals / Non-Goals

**Goals:**

- Que se pueda emitir una factura: escribirla, verla mientras se escribe, imprimirla y volver a ella.
- Que cambiar un diseño alcance a las facturas ya emitidas, porque nunca se archivó el papel.
- Que el formulario no haya que escribirlo una vez por diseño.
- Que la pantalla y la base de datos no puedan discrepar en un céntimo.

**Non-Goals:**

- Archivar el documento impreso en ninguna forma.
- Numeración, series, estados de emisión o cualquier otra pieza del dominio fiscal.
- Cálculo de impuestos.
- Tocar `Handoff` o el embed.

## Decisions

### La factura es una entidad nueva, no un `Handoff` con más TTL

`Invoice` guarda `{ templateId, data, items, params }` — que es, exactamente, `IHandoffData` sin
`token` ni `expiresAt`. La tentación de reusar `Handoff` subiendo su TTL es real y se descarta:

- Un handoff es **un enlace**: se identifica por un token opaco, nace para ser consumido y su cron lo
  borra. Una factura se identifica por sí misma y no caduca. Heredar el modelo del enlace para algo
  permanente obliga a explicar durante años por qué una factura tiene `token` y `expiresAt`.
- `prepareHandoff` es un `@action` público. Si otro producto lo llama, cambiarle el significado le
  rompe el contrato.

Lo interesante —convertir `Handoff` en `{ token, invoiceId, expiresAt }`, un puntero sin carga— es
una simplificación de verdad, pero es **otro cambio**: toca una acción pública y no tiene por qué
viajar con éste.

### El formulario sale del `dataSchema`, que es la tercera vez que se usa el mismo truco

```
dataSchema (23 caminos)
     │
     ├── isItemPath(path) ── sí ──▶ columna de la lista de líneas   (N veces)
     │
     └────────────────────── no ──▶ campo de la factura            (una vez)

type: string → texto    number → numérico    date → fecha    boolean → casilla
required     → marcado como obligatorio
```

Es el mismo patrón que ya gobierna dos cosas en este repositorio: el inspector se deriva del schema
de cada tipo de bloque, y `sampleDataFor` se deriva del `dataSchema`. Un diseño nuevo trae su
formulario igual que un tipo de bloque nuevo trae su panel de propiedades.

_Alternativa descartada_: un formulario escrito a mano para «la factura estándar». Funciona hasta que
alguien edita una plantilla en el editor, momento en el cual el formulario y el documento dejan de
hablar del mismo dato sin que nada lo detecte.

### `missingRequiredPaths` responde a las tres preguntas

Resulta que la función que ya existe contesta todo lo que este cambio necesita preguntar:

| Pregunta                                   | Cómo se responde                                                 |
| ------------------------------------------ | ---------------------------------------------------------------- |
| ¿Se puede guardar esta factura?            | `missingRequiredPaths(plantilla, datos, líneas) === []`          |
| ¿Esta otra plantilla admite estos datos?   | lo mismo, con la otra plantilla                                  |
| ¿Qué se desajustó al cambiar la plantilla? | lo mismo, más los caminos guardados que ya no están en el schema |

El selector de diseño no necesita una noción propia de compatibilidad: una plantilla es compatible
si no le falta ningún obligatorio. Y como los cinco presets comparten schema, hoy salen las cinco.

La segunda mitad del desajuste —datos guardados que la plantilla ya no usa— sí es nueva: es recorrer
las claves de los datos y ver cuáles no están en el `dataSchema`. Función pura, su test, y nada más.

### El dinero se calcula en un solo sitio, y en céntimos enteros

Los totales **son datos**: `factura.base`, `factura.impuestos` y `factura.total` están en el schema y
el render sólo los pinta. Nunca ha habido cálculo en el render ni en el servidor, y este cambio no lo
introduce.

Así que la multiplicación vive únicamente en el island del formulario, como comodidad que **rellena
los campos**, que siguen siendo editables:

```
cantidad × precio ──▶ escribe en item.total   (editable)
Σ item.total      ──▶ escribe en factura.base (editable)
                      factura.impuestos       (lo escribe la persona)
base + impuestos  ──▶ escribe en factura.total (editable)
                                │
                                ▼
                    se guarda tal cual, sin recalcular
```

Un solo sitio haciendo aritmética significa que pantalla y base de datos no pueden discrepar.

En céntimos enteros: `Math.round(precio * 100)` y se opera con enteros. `Money` y `big.js` viven en
la raíz del framework, que un island no puede importar sin meter express en el bundle. Añadir
`big.js` como dependencia del island sería un paquete nuevo para `cantidad × precio`; los enteros son
diez líneas y no arrastran nada.

`ponytail:` céntimos enteros asumen dos decimales. Si algún día hacen falta precios unitarios con
más decimales (combustible, horas fraccionadas al céntimo), el sitio a cambiar es una función y su
test, no el modelo.

Una cantidad fraccionaria (2,5 horas) se maneja igual: `Math.round(precioEnCentimos * cantidad)`.

### El visualizador es el lienzo sin gestos

Un único island sostiene el estado del formulario en signals y pinta las dos mitades, para que no
haya que sincronizar nada entre dos islands:

```
┌─ InvoiceEditor.island ─────────────────────────────────┐
│  signals: { templateId, data, items, params }          │
│      │                                                 │
│      ├──▶ <InvoiceForm/>    lee y escribe los signals  │
│      │                                                 │
│      └──▶ <InvoicePaper/>   render({ doc, data, items, │
│                                      params, assets }) │
└────────────────────────────────────────────────────────┘
```

`InvoicePaper` es `Canvas` sin arrastre, sin tiradores, sin marquesina y sin zoom: el mismo `div` con
ancho en milímetros y el mismo aislamiento respecto a los estilos de la aplicación.

Necesita los URIs de los assets igual que el editor, con `assetsFor(doc, assets)`, o el logo sale
vacío.

### Imprimir: esconder el chrome y desactivar cualquier escala

Dos detalles que se pasan por alto y arruinan el papel:

1. **El chrome se imprime si no se le dice que no.** Hace falta una regla `@media print` que oculte
   el formulario y la barra. Es la página entera la que se imprime, no el `div` del papel.
2. **Una `transform: scale()` sobre el papel escala también la impresión.** Si el visualizador lleva
   zoom de pantalla, la regla de impresión tiene que devolver la escala a 1, o se imprime un A4
   reducido dentro de un A4.

`pageCss` ya pone `@page`, los colores exactos y el pie fijo, así que la impresión en sí no necesita
nada nuevo del motor.

### El aviso de desajuste no toca los datos

Cuando una factura ya no encaja con su plantilla, se dice y ya. No se rellenan huecos, no se borran
huérfanos, no se migra nada en silencio. Es la lección de `withBlockDefaults` mirada desde el otro
lado: allí rellenar defectos era correcto porque el schema del bloque **es** la verdad; aquí el dato
guardado es la verdad y la plantilla es lo que se movió.

## Risks / Trade-offs

- **Reimprimir una factura vieja puede dar un papel distinto al que vio el cliente** → Es lo pedido
  explícitamente, no un efecto secundario. Si algún día hiciera falta congelar el papel de una
  factura concreta, la pieza que falta es guardar el `rev` de la plantilla; no hay que rehacer nada
  de esto para llegar ahí.
- **Sin numeración automática, habrá números repetidos y saltos** → Es la decisión tomada. El aviso
  junto al campo cubre el descuido honesto sin abrir la puerta a secuencias.
- **Los totales pueden no cuadrar con las líneas si alguien los edita a mano** → También deliberado:
  hay facturas con descuentos, redondeos y ajustes que ninguna fórmula adivina. El cálculo es una
  comodidad, no una regla.
- **Céntimos enteros asumen dos decimales** → Marcado en el código con su vía de salida.
- **El formulario derivado será feo para schemas grandes** → 23 campos en una columna cansan. Agrupar
  por el primer segmento del camino (`emisor.*`, `cliente.*`, `factura.*`) sale gratis del propio
  camino y ordena la pantalla sin inventar metadatos.
- **Una plantilla editada a mano puede declarar caminos que el formulario no sabe presentar bien**
  → El tipo declarado siempre da un control válido; el riesgo es estético, no funcional.
