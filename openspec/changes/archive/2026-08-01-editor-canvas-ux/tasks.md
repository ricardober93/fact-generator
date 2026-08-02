## 1. El modelo: celdas y bandas admitidas

- [x] 1.1 En `render/document.ts`: tipo `ICell` (`label`, `path`, `format?`, `widthMm`, `align`) y
      ampliar `IPropValue` con `ICell[]`. Sin `any`.
- [x] 1.2 En `render/blocks/defineBlock.ts`: añadir `'cells'` a `IPropType`, y las dos
      declaraciones opcionales de una definición: `bands?: IBandName[]` y `renderHeader?`.
      `defineBlock` valida que `bands`, si viene, no esté vacío ni traiga nombres desconocidos.
- [x] 1.3 En `render/blocks/registry.ts`: `blockKindsForBand(band)` devuelve los tipos admitidos
      en esa banda; sin declaración, un tipo se admite en las cinco.
- [x] 1.4 En `render/validateDocument.ts`: validar una propiedad `cells` —lista, etiqueta cadena,
      ancho número mayor que cero, alineación admitida, ruta cadena— y rechazar un bloque
      colocado en una banda que su definición no admite. Los mensajes nombran la celda o el par
      tipo/banda culpable.
- [x] 1.5 `blocks.unit.test.ts` y el test de validación: `defineBlock` rechaza `bands` vacío y
      nombres desconocidos; `blockKindsForBand` filtra; una lista de celdas válida pasa; ancho
      cero, alineación desconocida y etiqueta no textual fallan nombrando la celda; un bloque en
      banda no admitida falla y en la admitida pasa.

## 2. El motor: bloques compuestos y proyección de cabecera

- [x] 2.1 `render/blocks/table.tsx`: `bands: ['detail']`, propiedad `cells`, dispone las celdas en
      horizontal desde el origen del bloque respetando `widthMm`, resuelve cada ruta con
      `ctx.resolve` y aplica su formato y su alineación. Colores y tipografía por token, nunca
      literales.
- [x] 2.2 Aportar `renderHeader` en `table.tsx`: la misma fila con las etiquetas literales de las
      celdas. La etiqueta se emite como texto, nunca como marcado.
- [x] 2.3 `render/blocks/list.tsx`: apila las celdas repartiendo el alto del bloque; cada fila
      emite etiqueta y valor, con `widthMm` como ancho de la etiqueta.
- [x] 2.4 En `render/bands.tsx`: `renderDetailTable` proyecta, para cada bloque de `detail` cuya
      definición aporta `renderHeader`, un contenedor dentro de la banda `detailHeader` con la
      misma `xMm` y el mismo `widthMm`, marcado con su atributo propio de referencia —nunca un
      segundo `data-block` con el mismo identificador—.
- [x] 2.5 Registrar `table` y `list` en el registro de bloques.
- [x] 2.6 `blocks.unit.test.ts`: cada tipo nuevo produce marcado; los anchos declarados se
      respetan; una ruta ausente pinta vacío sin lanzar; `<b>Total</b>` en una etiqueta aparece
      como caracteres y no como elemento.
- [x] 2.7 `render.unit.test.ts`: con tres ítems, la cabecera proyectada aparece **una** vez dentro
      del `<thead>` y `detail` tres veces; la proyección comparte `x` y ancho con su bloque;
      `data-block` sigue siendo único en todo el marcado; sin `renderHeader` no se proyecta nada.
- [x] 2.8 Añadir una tabla y una lista al fixture `__fixtures__/invoiceDocument.ts` y regenerar el
      golden con `npm run fixtures:golden`.

## 3. Lógica pura del lienzo

- [x] 3.1 `ui/snapping.ts`: `snapCandidates` toma el rectángulo, sus hermanos de banda y la caja
      de la banda; `snapRect` toma esos candidatos y el umbral en milímetros y devuelve el
      rectángulo enganchado y las guías activas, cada eje por separado. Sin DOM.
- [x] 3.2 Componer el gesto en `geometry.ts` en el orden decidido: píxeles → milímetros →
      redondeo → imán → `clampRect`. El clamp queda siempre el último.
- [x] 3.3 `geometry.ts`: `resizedRect` pasa a recibir el tirador (cuatro esquinas y cuatro lados) y
      deja fijo el borde opuesto, respetando `MIN_SIZE_MM` y la banda.
- [x] 3.4 `ui/arrange.ts`: `moveBlocks` (desplazamiento único limitado por la caja envolvente),
      `alignBlocks`, `distributeBlocks`, `duplicateBlocks`, `pasteBlocks` y `reorderBlock`. Todas
      reciben un documento y devuelven otro; los identificadores nuevos no colisionan.
- [x] 3.5 `ui/marquee.ts` o función en `arrange.ts`: qué bloques de una banda quedan contenidos en
      un rectángulo de selección.
- [x] 3.6 `snapping.unit.test.ts`: se engancha al borde y al centro de un vecino y a los bordes de
      la banda; cada eje se engancha por separado; fuera del umbral no hay enganche; el enganche
      nunca saca el bloque de la banda.
- [x] 3.7 `arrange.unit.test.ts`: mover un conjunto conserva las distancias y se detiene como
      conjunto en el borde; alinear iguala coordenadas sin tocar tamaños; distribuir deja huecos
      iguales sin mover los extremos; con menos de dos bloques no hay cambio; duplicar y pegar
      crean identificadores nuevos sin tocar los originales; reordenar cambia el orden de pintado.
- [x] 3.8 `geometry.unit.test.ts`: cada uno de los ocho tiradores mueve los bordes que le tocan y
      deja fijo el opuesto; el imán no sobrevive al clamp en el borde de la banda.

## 4. El store

- [x] 4.1 `editorStore.ts`: sustituir `selectedBand` + `selectedBlockId` por
      `selection: Signal<{ band: IBandName; blockIds: string[] } | null>`, con `select`,
      `toggleInSelection`, `selectMany` y `clearSelection`. Seleccionar en otra banda reemplaza.
- [x] 4.2 Añadir el portapapeles interno (señal con clones) y la señal de zoom, con acercar,
      alejar, tamaño real y encaje al ancho. El zoom no escribe en el documento.
- [x] 4.3 Actualizar los consumidores de la selección antigua (`Canvas`, `Palette`, `Inspector`,
      `Editor.island`) al nuevo contrato.
- [x] 4.4 `editorStore.unit.test.ts`: la selección nunca mezcla bandas; alternar añade y quita;
      copiar y pegar no altera el original; el zoom cambia la señal y deja el documento intacto;
      el límite de deshacer sigue respetándose.

## 5. El lienzo

- [x] 5.1 Extraer la máquina de estados del puntero a `ui/canvasGestures.ts`: mover, redimensionar
      por tirador, marco de selección e inserción soltada desde la paleta. Solo cableado: la
      geometría la deciden las funciones puras.
- [x] 5.2 `ui/SelectionLayer.tsx`: contorno de la selección —simple o múltiple—, los ocho
      tiradores cuando hay un solo bloque, las guías de imán activas y el indicador de
      `x/y/ancho/alto` en milímetros durante el gesto.
- [x] 5.3 Dibujar el marco de selección al arrastrar desde una zona vacía de una banda.
- [x] 5.4 Aplicar el zoom como `transform: scale()` sobre el papel y comprobar que `pxPerMm` sigue
      saliendo de la medición del nodo, sin constante nueva.
- [x] 5.5 Un clic sobre una cabecera proyectada selecciona el bloque de `detail` que la origina.
- [x] 5.6 Mantener `Canvas.tsx` por debajo de 250 líneas y cada función por debajo de 25.

## 6. La paleta

- [x] 6.1 Ofrecer los tipos filtrados por la banda de destino con `blockKindsForBand`.
- [x] 6.2 Insertar arrastrando: fantasma durante el gesto, banda deducida del punto de soltado,
      origen del bloque en ese punto y una sola entrada de deshacer. Soltar fuera no crea nada.
- [x] 6.3 Conservar la inserción por activación con teclado en la banda activa, con nombre
      accesible en cada tipo.
- [x] 6.4 `documentEdits.unit.test.ts`: `addBlockAt` coloca el bloque en el punto indicado ajustado
      a la banda, con los valores por defecto de su definición, y rechaza un tipo no admitido en
      esa banda.

## 7. Capas, alineación y zoom en el chrome

- [x] 7.1 `ui/LayersPanel.tsx`: los bloques de la banda en orden de pintado, con selección
      bidireccional con el lienzo, reordenar y borrar. Sustituye al `<select>` de banda como forma
      de cambiar de banda.
- [x] 7.2 Barra de alinear y distribuir, visible con dos o más bloques seleccionados; distribuir
      requiere tres.
- [x] 7.3 `ui/ZoomControls.tsx`: acercar, alejar, tamaño real y encaje al ancho, con nombre
      accesible y estado visible.
- [x] 7.4 Estilos en `editorCss.ts` con tokens del sistema de diseño; ningún color ni medida
      suelta salvo las posiciones calculadas en píxeles de la capa de selección.

## 8. El inspector

- [x] 8.1 Sección de geometría con campos numéricos de `xMm`, `yMm`, `widthMm` y `heightMm`, cada
      uno asociado a su etiqueta; escribir ajusta a la banda y deja una entrada de deshacer; un
      valor no numérico no escribe.
- [x] 8.2 `ui/CellsEditor.tsx`: añadir, borrar y reordenar celdas, y editar etiqueta, ruta,
      formato, ancho y alineación, reutilizando el editor de enlaces del texto. Muestra la suma de
      anchos frente al ancho del bloque.
- [x] 8.3 Enlazar una celda a una ruta nueva la declara opcional en el `dataSchema`, por el mismo
      camino que un fragmento de texto (`applyPropChange`).
- [x] 8.4 `Inspector.unit.test.ts`: un bloque con propiedad `cells` recibe su editor sin que la
      definición aporte `Inspector`; añadir, borrar y reordenar escriben solo esa propiedad;
      enlazar una ruta nueva la añade al schema como opcional; un ancho no numérico no escribe.

## 9. Teclado

- [x] 9.1 Ampliar `useShortcuts`: flechas 1 mm y 10 mm con `Shift`, duplicar, copiar, pegar y
      `Escape`. `Suprimir` pasa a borrar toda la selección. La guarda de foco actual se conserva.
- [x] 9.2 Cada pulsación de flecha deja su propia entrada de deshacer, y ningún atajo previene el
      evento cuando no hay selección.
- [x] 9.3 Prueba sobre las funciones puras que respaldan los atajos: desplazamiento de 1 y 10 mm
      limitado a la banda, borrado de una selección múltiple, pegado con identificadores nuevos.

## 10. Cierre

- [x] 10.1 `npm run tsc`, `npm run test:unit` y `npm run fmt:check` en verde.
- [x] 10.2 Revisar que ningún archivo pasa de 250 líneas y ninguna función de 25, y que no hay
      comentarios ni `any` en el código nuevo.
- [x] 10.3 Comprobar que `render/` sigue sin importar la raíz del framework y que el bundle del
      island se construye (`npm run build`).
- [x] 10.4 Verificar a mano el recorrido completo: arrastrar una tabla desde la paleta a `detail`,
      editar sus columnas, alinearla con el resto, comprobar en Ctrl+P que la cabecera se repite
      en la segunda página, guardar y recargar.
