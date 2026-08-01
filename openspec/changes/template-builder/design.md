## Context

Ver `ARCHITECTURE.md` para la frontera de `render/`, el registro de bloques y las decisiones
cerradas. Aquí solo lo que este cambio añade o contradice.

Estado de partida, verificado en el código:

- `render(input) -> VNode` es puro e isomorfo, y `renderBand` / `renderBlock` ya emiten el
  contenedor de banda con `position: relative` y el bloque con `left/top/width/height` en `mm`.
  El sistema de coordenadas que necesita el lienzo ya existe: no hay que inventarlo.
- `applyDefaults(kind, partial)` compone un bloque nuevo desde el registro.
- `TemplateRepository.saveDocument(id, doc, expectedRev)` toma el `Locker`, compara `rev` y
  devuelve `{ status: 'conflict' }` sin escribir. `validateDocument` corre dentro.
- `IBlockDefinition.Inspector` existe como `unknown` y ningún bloque lo aporta.
- `render()` lanza `MissingDataError` si falta una ruta obligatoria del `dataSchema`.
- `renderPageFooter` emite `position: fixed` incondicional.

## Goals / Non-Goals

**Goals:**

- Que el preview del editor sea literalmente `render()`, sin una segunda implementación.
- Mover y redimensionar bloques en milímetros relativos a su banda, con la aritmética medida
  del DOM real y no asumida.
- Editar propiedades sin escribir un inspector por tipo de bloque.
- Guardar sin perder trabajo cuando otro guardó antes.

**Non-Goals:**

- Paginación en pantalla, PDF de servidor, subida de assets, autenticación. Ver
  "Fuera de alcance" en `proposal.md`.
- Edición colaborativa en vivo. El bloqueo optimista por `rev` es la única concurrencia.
- Edición de texto enriquecido dentro del lienzo. El texto se edita en el inspector, sobre su
  estructura de fragmentos, nunca como HTML.

## Decisions

### 1. Un solo island, no cuatro

`Editor.island.tsx` es el único `island()`. Paleta, lienzo e inspector son componentes suyos.

*Por qué:* dos razones independientes, ambas verificadas en el cambio `embed-iframe`. La
hidratación repinta el island **solo con sus props serializadas** y descarta `children`, así que
un island no puede envolver contenido servidor que necesite conservar. Y dos islands hermanos no
comparten estado: el documento en edición es un único valor que los tres leen y dos escriben.

*Alternativa descartada:* un island por panel más una señal en módulo compartido. El bundler da
a cada island su propio grafo; compartir un módulo con estado entre bundles no está garantizado.

*Props del island:* `{ id, doc, rev }` — JSON serializable, que es lo que exige la hidratación.

### 2. El lienzo llama a `render()`; el marcado dice a qué banda y bloque pertenece cada cosa

El lienzo pinta `render({ doc, data: sample, items: [sampleItem] })` y superpone su propia capa
de selección. Para traducir un puntero a un bloque y un desplazamiento a milímetros necesita el
rectángulo real de la banda; se obtiene con `getBoundingClientRect()` sobre el nodo de banda.

Para llegar a ese nodo, `renderBand` emite `data-band="<nombre>"` y `renderBlock`
`data-block="<id>"`. Dos atributos.

*Por qué:* el editor lee la geometría **medida** del documento que el navegador acaba de
maquetar, en vez de recalcularla. Las alternativas eran peores:

- *Reensamblar las bandas en el editor* llamando a `renderBand` una a una: duplica el montaje de
  `render()` y es exactamente la divergencia que la arquitectura prohíbe.
- *Calcular el desplazamiento de cada banda sumando `heightMm`*: funciona hoy y se rompe en
  silencio el día que la tabla de detalle gane un borde o un padding.

### 3. La escala px↔mm se mide, no se asume

`pxPerMm = bandaRect.width / usableWidthMm(doc.page)`, recalculado con `ResizeObserver`.

*Por qué:* CSS define `1mm = 96/25.4 px`, pero esa constante deja de valer en cuanto hay zoom de
navegador o un `transform: scale` de zoom del editor. Medir es una división y sobrevive a ambos.

### 4. El documento se escribe al soltar, no al mover

Durante el arrastre solo cambia una señal con el rectángulo provisional del bloque, que mueve el
overlay de selección. El documento —y por tanto `render()`— se actualiza una vez, en `pointerup`.

*Por qué:* `render()` repinta el documento entero. Hacerlo por cada `pointermove` es repintar N
bloques a 60 Hz para mover uno. Además mantiene la pila de deshacer en una entrada por gesto en
vez de cientos.

Se usa `setPointerCapture` para no perder el gesto al salirse del bloque, y `user-select: none`
en el lienzo mientras dura.

### 5. El inspector lo dirige el schema; `Inspector` propio pasa a opcional

`IBlockSchema` ya mapea cada propiedad a un `IPropType`. Un editor por tipo —`string`, `number`,
`boolean`, `token`, `asset`, `text`, `enum:a,b,c`— cubre los cuatro bloques actuales sin una sola
línea específica de bloque. `IBlockDefinition.Inspector` se tipa y queda como escape para la
propiedad que no se deje editar por su tipo; ninguna de las actuales lo necesita.

*Por qué:* cuatro inspectores serían cuatro formularios que repiten el mismo `<input>` por
propiedad, y un tipo de bloque nuevo obligaría a escribir el quinto. Con el schema, un tipo nuevo
tiene panel de propiedades por el hecho de declarar su schema — que es lo que la arquitectura
promete del registro de bloques.

- `token` se ofrece como desplegable de las claves de `doc.theme`, con valor `@clave`. Es lo que
  mantiene la promesa de que un bloque nunca guarda un literal de tema.
- `asset` elige entre los assets existentes. Subir queda fuera de alcance.

### 6. Las rutas de binding se declaran escribiéndolas

El editor de contenido de texto edita `ITextContent.fragments`: filas de literal o de binding. La
ruta de un binding se escribe con autocompletado de las rutas que ya hay en `doc.dataSchema`, y
una ruta nueva se añade al `dataSchema` como `{ type: 'string', required: false }`.

*Por qué:* sin esto el editor solo podría enlazar contra un `dataSchema` escrito a mano fuera del
editor, que es justo el problema que este cambio viene a quitar. `required: false` es el valor
seguro: una ruta recién inventada no puede tumbar el render de un embed existente con
`MissingDataError`.

*Alternativa aplazada:* un panel completo de `dataSchema` y `params` con tipo y obligatoriedad.
Ver Open Questions.

### 7. Datos de muestra derivados del schema

`sampleDataFor(doc)` produce un valor por cada `IDataPath` según su tipo, y un item de detalle.
Vive en `render/` porque el island la necesita en el navegador; es pura y se prueba sola.

*Por qué un solo item de detalle:* el lienzo edita la banda `detail` como plantilla de fila, no
como lista. Con un item hay exactamente un nodo `data-band="detail"` y la selección no es
ambigua.

### 8. El pie: fijo solo al imprimir

`renderPageFooter` deja de llevar `position: fixed` inline. `pageCss` emite la regla con clase:
en pantalla el pie queda en flujo al final del documento; dentro de `@media print` recupera
`position: fixed; bottom: 0` con el ancho de la columna útil, de modo que `left` resuelve a su
posición estática y queda alineado con el resto del documento.

*Por qué es requisito previo y no un extra:* un descendiente `position: fixed` se posiciona
respecto al viewport, así que dentro del lienzo el pie se despegaría del papel y se quedaría
pegado a la ventana del editor. De paso corrige la desalineación detectada al validar
`embed-iframe` en navegador (pie a `left: 0` sobre el ancho del papel), que es la tarea 8.5 que
`invoice-renderer` dejó pendiente.

*Alternativa descartada:* dar al lienzo un `transform: translateZ(0)` para que se convierta en
bloque contenedor de los `fixed` descendientes. Funciona, cabe en una línea, y es exactamente el
truco que nadie entiende a las 3 de la mañana. Además no corrige la desalineación.

### 9. Guardado

`@action save({ id, doc, rev })` llama a `saveDocument` y traduce `conflict` a `CustomError`
`httpCode: 409`. El island muestra el aviso y **no** toca el documento en edición: lo editado
sigue en pantalla y el usuario decide.

El documento entero viaja en cada guardado. Cabe en el límite de 100 kb del body de `@action`
porque los assets son ids, no base64. No hay guardado automático: el autosave con bloqueo
optimista genera conflictos contra uno mismo.

### 10. Deshacer

Pila acotada de instantáneas del documento (estructura JSON completa), una por gesto commitado,
con `Ctrl/Cmd+Z` y `Ctrl/Cmd+Shift+Z`.

*Por qué instantáneas y no comandos invertibles:* el documento es un valor plano y pequeño;
clonarlo cuesta menos que mantener un comando inverso por cada tipo de edición.

### 11. Sin dependencias npm nuevas

- Arrastre y redimensión: Pointer Events + `setPointerCapture`, nativos. No entra
  `interact.js` ni `dnd-kit` (además, `dnd-kit` es React-only).
- Estado: las señales que ya reexporta `@wabot-dev/framework/ui`.
- Clonado para la pila de deshacer: `structuredClone`, nativo en Node 22 y en el navegador.
- Ids de bloque: `crypto.randomUUID()`, que `applyDefaults` ya usa.

## Risks / Trade-offs

- **El bundle del island incluye todo `render/` y los cuatro bloques** → Es el precio de que el
  preview no pueda divergir, y era la decisión de arquitectura desde el principio. `render/` no
  arrastra la raíz del framework, así que no entra express ni pg; si entrara, el build falla solo.
- **Repintar el documento entero en cada edición commitada** → Aceptable a la escala real de una
  factura (decenas de bloques). Si molestara, el arreglo es memoizar `renderBlock` por bloque, no
  reescribir el lienzo.
- **Un solo tirador de redimensión (esquina inferior derecha)** → Los ocho tiradores se añaden
  cuando alguien los pida; mientras tanto, el inspector edita `x/y/ancho/alto` numéricamente, que
  además es la única forma precisa.
- **Ajuste a 1 mm siempre** → Sin modificador para movimiento libre. Se añade si aparece un caso
  que lo necesite; el inspector ya permite el valor exacto.
- **`crypto.randomUUID()` exige contexto seguro** → `localhost` y `https` lo son; servir el editor
  por `http://` contra una IP de red no lo es y rompería la creación de bloques. Es la misma
  condición que ya tiene el resto del producto.
- **El golden fixture de `invoice-renderer` cambia** por `data-band`, `data-block` y el pie → Se
  regenera en el mismo cambio y las pruebas del pie se reescriben contra el nuevo contrato. Es
  ruido de diff esperado, no una regresión.
- **Añadir una ruta de binding muta `dataSchema` sin preguntar** → Con `required: false` no puede
  romper un embed en producción; como mucho deja una ruta declarada que nadie usa.

## Migration Plan

No hay migración de datos: los documentos guardados ya cumplen el modelo y `rev` existe desde
`invoice-template-model`. El cambio es aditivo salvo el marcado del pie, que solo afecta a cómo
se ve en pantalla un embed ya servido —a mejor— y no a lo impreso. Rollback = revertir el commit.

## Open Questions

- **Panel de `params` y `dataSchema`.** Este cambio declara rutas de datos al vuelo al enlazarlas,
  pero no permite marcar una como obligatoria ni declarar un parámetro del embed con su tipo y sus
  valores admitidos. Sin eso, un template nuevo no puede estrenar parámetros de iframe desde el
  editor. Candidato a cambio propio inmediatamente después de este.
- **Alta de plantilla.** `create` arranca con `emptyDocument()`. Queda por decidir si hace falta
  duplicar una existente como punto de partida, que es lo que la gente acaba pidiendo.
- **Editar la altura de una banda.** El arrastre mueve bloques; la altura de la banda solo se
  toca hoy desde el inspector de la banda seleccionada. Falta decidir si se arrastra su borde
  inferior.
