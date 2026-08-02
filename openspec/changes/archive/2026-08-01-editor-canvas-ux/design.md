## Context

El editor de hoy resuelve un gesto —arrastrar un bloque— y lo resuelve bien: la conversión
píxel–milímetro se mide del nodo maquetado, el documento se escribe al soltar y la geometría vive
en funciones puras (`geometry.ts`, `documentEdits.ts`). Lo que falta no es motor sino **capa de
interacción**: no hay imán, ni selección múltiple, ni teclado, ni zoom, ni lista de lo que hay en
la banda; y la unidad con la que se construye —un bloque, un rectángulo, una propiedad— es
demasiado pequeña para la tabla de ítems, que es el objeto central de una factura.

Las restricciones del proyecto están en `ARCHITECTURE.md` y no se repiten aquí. Las que este
diseño toca de cerca: el modelo de bandas con coordenadas relativas a la banda, `render/` como
código isomorfo que solo importa `@wabot-dev/framework/ui`, el registro de bloques como único
punto de extensión, y la ausencia de jsdom en las pruebas —hay `node:test` y `createUiHarness`,
que renderiza SSR, así que **nada que dependa del DOM del navegador es verificable en la suite**.

## Goals / Non-Goals

**Goals:**

- Colocar un bloque donde se quiere sin mirar milímetros: imán, guías, teclado, alineación.
- Trabajar con varios bloques a la vez dentro de una banda.
- Que una tabla de ítems sea **un objeto**, con sus columnas en un solo sitio.
- Que toda la lógica nueva viva en funciones puras verificables sin navegador.
- No pagar el rediseño con dependencias nuevas ni con divergencia entre editor y embed.

**Non-Goals:**

- Bloques anidados, grupos y jerarquía. Lo que los pediría —la tabla— lo resuelve el bloque
  compuesto.
- Selección entre bandas: las coordenadas son relativas a la banda.
- Portapapeles del sistema, edición colaborativa, rotación, auto-layout, historial en la nube.
- Paginación en pantalla, que sigue abierta en `ARCHITECTURE.md`.

## Decisions

### La selección pasa de un identificador a (banda, lista de identificadores)

`IEditorStore` deja de tener `selectedBlockId: Signal<string | null>` y pasa a
`selection: Signal<{ band: IBandName; blockIds: string[] } | null>`. Una selección siempre
pertenece a una sola banda.

Alternativa descartada: selección global con los bloques agrupados por banda. Añade un caso —el
conjunto a caballo entre dos bandas— que no tiene significado geométrico: mover 5 mm hacia abajo
un bloque de `header` y otro de `detail` son dos operaciones distintas en dos espacios distintos.

### El imán es una función pura, y su umbral se mide en píxeles

`snapping.ts` recibe el rectángulo en movimiento, los rectángulos hermanos de la banda, la caja de
la banda y el umbral **en milímetros ya convertido**, y devuelve el desplazamiento a aplicar y las
guías activas. No toca el DOM, así que se prueba con `node:test` como el resto de la geometría.

El umbral nace en píxeles de pantalla (≈6 px) y se divide por `pxPerMm`, que el lienzo ya mide.
Consecuencia buscada: **el imán se siente igual a cualquier zoom**. Con el umbral fijado en
milímetros, al 200% se pegaría el doble de lejos.

Orden de operaciones del gesto, y el orden importa:

```
delta px → mm → redondeo a mm entero → imán → clamp a la banda
```

El redondeo va antes del imán para que no deshaga un enganche; el clamp va el último porque el
borde de la banda gana siempre, incluso a un candidato de imán.

### Mover un conjunto se limita una vez, no bloque a bloque

Para una selección múltiple se calcula la caja envolvente, se limita **el desplazamiento** para
que esa caja no salga de la banda, y se aplica el mismo desplazamiento a todos.

Alternativa descartada: limitar cada bloque por separado. Al llegar al borde, unos se detienen y
otros no, y el conjunto se deforma: se pierde justo la propiedad que hace útil la multi-selección.

### Insertar arrastrando con eventos de puntero, no con HTML5 drag-and-drop

El lienzo ya tiene una máquina de estados de puntero con `setPointerCapture`. La paleta reutiliza
esa máquina: `pointerdown` en el tipo, arrastre con un fantasma, `pointerup` sobre una banda →
inserción.

Alternativas descartadas: la API HTML5 de arrastre —sin captura de puntero, con imagen de arrastre
propia del navegador y comportamiento pobre en táctil— y una librería de arrastre; `dnd-kit` y
compañía son de React y aquí hay Preact, y el gesto ya está escrito.

**La inserción por activación se queda.** Un arrastre no es accesible por teclado: activar un tipo
de la paleta sigue insertando en la banda activa. Es un requisito, no un residuo.

### El zoom es `transform: scale()` sobre el papel

Es la opción que **no obliga a tocar nada más**: `getBoundingClientRect()` devuelve el ancho ya
escalado, así que `pxPerMm` sale correcto de la medición que el lienzo ya hace y toda la
aritmética del gesto sigue valiendo sin cambios.

Alternativas descartadas: cambiar el ancho en milímetros del papel —falsearía la unidad del
documento, que es la que se imprime— y la propiedad `zoom`, cuyo reflejo en los rectángulos medidos
no es homogéneo entre navegadores.

Nota: un `transform` crea bloque contenedor para descendientes `position: fixed`. Aquí no muerde,
porque el pie fijo solo existe dentro de `@media print` (`printCss.ts`) y del editor no se
imprime.

### `cells` es un tipo de propiedad, no un árbol de bloques hijos

Un bloque sigue siendo plano: identificador, tipo, rectángulo y propiedades. La tabla es un bloque
cuya propiedad `cells` es una lista ordenada de celdas.

Alternativa descartada: bloques anidados. Traen espacio de coordenadas por nivel, hit-testing
recursivo, orden de pintado por nivel y arrastre dentro de un padre. Es un editor distinto, y el
único caso que lo pedía —repetir una fila por ítem— ya lo resuelve la banda `detail`.

### Una sola forma de celda para la tabla y la lista

`{ label, path, format, widthMm, align }`. La tabla las dispone en horizontal y `widthMm` es el
ancho de columna; la lista las apila y `widthMm` es el ancho de la etiqueta. Un tipo de propiedad,
un validador, un editor de repetición.

Alternativa descartada: dos tipos de propiedad, `columns` y `rows`. Serían la misma estructura con
dos nombres, y duplicarían el editor del inspector, que es la parte cara.

### La cabecera se proyecta desde `detail` a `detailHeader`

Una definición puede aportar `renderHeader`. `renderDetailTable` emite, para cada bloque de
`detail` que la aporte, su cabecera dentro de la banda `detailHeader`, con la misma `x` y el mismo
ancho. Son unas diez líneas en `bands.tsx`.

Alternativas descartadas:

| Opción                                               | Por qué no                                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| Dos bloques enlazados (cabecera + fila)              | Dos objetos que deben coincidir a mano: es el problema que venimos a resolver |
| La tabla pinta su propia cabecera dentro de `detail` | La cabecera se repetiría una vez por ítem                                     |
| Una sexta banda para la cabecera de tabla            | Reabre la decisión cerrada de las cinco bandas                                |

La proyección **no** emite un segundo `data-block` con el mismo identificador —rompería la
unicidad en la que se apoya el editor para medir—: lleva un atributo propio que referencia al
bloque de origen, y el lienzo traduce un clic en él a la selección de la tabla.

### El orden de pintado es el orden del array, y no hay campo `z`

La lista de capas reordena el array de bloques de la banda. El motor ya pinta en ese orden; un
campo `z` sería una segunda fuente de verdad que habría que mantener consistente con el array.

### Alinear, distribuir, reordenar y pegar son funciones puras sobre el documento

Viven en `arrange.ts` junto al resto de ediciones (`documentEdits.ts`), reciben un documento y
devuelven otro. De ahí salen gratis dos cosas: la granularidad del deshacer —un `commit`, una
entrada— y la verificabilidad sin navegador.

### Portapapeles interno

Copiar guarda clones en una señal del editor; pegar los inserta en la banda activa con
identificadores nuevos y un desplazamiento. Nada de `navigator.clipboard`: pide permisos, es
asíncrono y el caso que resolvería —pegar entre pestañas— no está pedido.

### Reparto de archivos

`Canvas.tsx` no puede absorber imán, ocho tiradores, marco de selección, indicador y capas sin
pasar de 250 líneas. Queda: `Canvas.tsx` (superficie y render), `canvasGestures.ts` (máquina de
estados del puntero), `SelectionLayer.tsx` (contorno, tiradores, guías, indicador),
`LayersPanel.tsx`, `CellsEditor.tsx`, `ZoomControls.tsx`, y `snapping.ts` + `arrange.ts` como
lógica pura.

### Sin dependencias npm nuevas

Nada de librerías de arrastre, de zoom, ni de tablas. El gesto son eventos de puntero nativos, el
zoom es una transformación CSS, la tabla es marcado que ya sabemos emitir, y el imán es aritmética
sobre números que ya tenemos medidos.

## Risks / Trade-offs

- **La capa de gesto no se puede probar en la suite** (no hay jsdom) → todo lo decidible se
  empuja a funciones puras con prueba propia; en `canvasGestures.ts` queda solo el cableado de
  eventos, sin decisiones de geometría.
- **La proyección de cabecera cambia el motor de render, que sirve también al embed** → los
  requisitos de proyección se prueban sobre la función pura `render()`, y el golden se regenera
  con una tabla y una lista para que cualquier deriva salte en la comparación.
- **Los anchos de celda pueden sumar más que el ancho del bloque** → se pinta lo que cabe y el
  resto se recorta; el inspector muestra la suma para que el desajuste sea visible. No se
  reescalan las columnas automáticamente: sería un valor calculado que nadie pidió y que
  sorprende al imprimir.
- **La selección múltiple redondea a milímetro entero** como el resto del editor: mover un
  conjunto y devolverlo puede dejar una diferencia de 1 mm respecto al origen. Es el precio ya
  aceptado de la unidad entera, no una regresión nueva.
- **El imán puede estorbar en documentos densos** → la tecla modificadora lo desactiva durante el
  gesto, y el umbral es una constante única, fácil de recalibrar.
- **Más superficie de teclado, más riesgo de capturar teclas del navegador** → los atajos siguen
  saliendo por la guarda de foco que ya existe (`isTypingTarget`), y solo se previene el evento
  cuando hay selección.

## Migration Plan

No hay migración de datos: `cells`, `table` y `list` solo aparecen en bloques nuevos, y los
documentos guardados validan igual porque las dos declaraciones nuevas de `defineBlock` son
opcionales. El despliegue es único; la reversión es revertir el código, porque ningún documento
existente cambia de forma. El golden se regenera con `npm run fixtures:golden` dentro del cambio,
no después.

## Open Questions

- El umbral del imán (≈6 px) y la tecla que lo desactiva se fijan al implementar y se recalibran
  con uso real. Son una constante y un `event.altKey`, no una decisión de arquitectura.
- Si la lista de capas debe mostrar un nombre editable por bloque, o basta con el tipo más un
  extracto de su contenido. Se empieza por lo segundo, que no añade campo al modelo.
