## Why

Ya existen cinco diseños de factura terminados —dos chevron, dos mosaico y uno de bandas— y hoy se
eligen desde un `<select>` con cinco nombres en texto. **Elegir un diseño a ciegas es lo contrario
de elegir un diseño.** El desplegable no enseña lo único que distingue a «Chevron pizarra» de
«Mosaico rojo», que es cómo se ven.

El problema mayor viene después. Un preset **es** su tema: `chevron-slate` y `chevron-amber` son el
mismo documento con un token distinto, y `bars-navy` mete once tokens. Pero el editor no tiene panel
de tema: un color solo se cambia seleccionando un bloque que lo referencie y usando el selector de
token que hay dentro de su fila de propiedades. Para recolorear el mosaico hay que cazar un bloque
que use `@accent` entre **sesenta y seis** cajas de decoración que además llenan la lista de capas
hasta hacerla inservible. Y los presets fijan altos de banda exactos —el mosaico da 128 mm de
cabecera— que ninguna superficie del editor sabe cambiar, aunque `setBandHeight` lleva escrito y
probado desde el cambio anterior sin que nadie lo llame.

O sea: los diseños se pueden crear pero apenas se pueden **elegir**, y una vez creados apenas se
pueden **editar**. Es ahora porque el catálogo acaba de nacer con cinco entradas y el coste de
darle su superficie no vuelve a ser tan bajo.

## What Changes

- **El catálogo de diseños pasa a ser una capacidad con nombre.** Un preset deja de ser un par
  `{id, name}` y declara además una descripción y la familia a la que pertenece, para que la
  galería pueda agruparlos y para que añadir un diseño siga siendo tocar un archivo.
- **La elección se hace mirando, no leyendo.** El alta de plantilla muestra una galería de tarjetas
  con una previsualización real de cada diseño, generada con el mismo `render` que pinta el lienzo
  y el embed —nunca una captura de pantalla, que se quedaría vieja al primer retoque.
- **Un diseño se puede aplicar a una plantilla que ya existe**, desde el editor, con confirmación
  previa porque reemplaza el documento entero, y deshacible con el mismo historial que el resto de
  las ediciones.
- **El tema del documento gana su propio panel.** Todos los tokens de `doc.theme` en un sitio, con
  editor de color para los que lo son y campo de texto para los que no, sin tener que encontrar
  antes un bloque que los referencie. Es lo que convierte «pasar de pizarra a ámbar» en un gesto.
- **El alto de cada banda se edita**, conectando el `setBandHeight` que ya existe. Es el control que
  falta para que la cabecera de 128 mm del mosaico se pueda ajustar.
- **Los bloques decorativos dejan de estorbar.** Un bloque puede marcarse como decoración: sigue
  pintándose igual, pero la lista de capas lo agrupa en una entrada plegable y no se selecciona con
  un clic en el lienzo. Sin esto, las 66 cajas del mosaico hacen la banda inmanejable.
- **El motor documenta lo que ya hace.** `box` admite `rotationDeg` y `table` admite `headerColor`;
  la impresión conserva los colores de fondo; las filas alternan a través de un token; una fecha
  `YYYY-MM-DD` no se desplaza un día por la zona horaria. Está implementado y probado desde el
  trabajo de los diseños, pero **no está en ninguna spec**, y eso es deuda, no funcionalidad nueva.

## Capabilities

### New Capabilities

- `template-presets`: el catálogo de diseños de partida. Qué declara un preset, la garantía de que
  todo preset produce un documento válido y autosuficiente, cómo se previsualiza y qué significa
  aplicarlo a una plantilla nueva o existente.

### Modified Capabilities

- `template-editor`: gana el panel de tema, el control de alto de banda, el tratamiento de los
  bloques decorativos y la acción de aplicar un diseño sobre el documento abierto. Ningún requisito
  existente cambia de comportamiento.
- `invoice-document-model`: `box` gana la propiedad `rotationDeg` y `table` gana `headerColor`,
  ambas con su valor por defecto. Son propiedades nuevas en el schema de dos tipos de bloque, no un
  cambio del modelo.
- `invoice-renderer`: se especifica que la impresión conserva los fondos de color, que las filas de
  detalle pueden alternar de color a través de un token del tema, y que un valor de fecha sin hora
  se interpreta en la zona local y no en UTC.

## Impact

- **Código nuevo**: la metadata del catálogo y la previsualización de un preset; un panel de tema y
  un control de banda en el chrome del editor; la acción del controlador que aplica un diseño.
- **Código modificado**: `presets.ts` (metadata), `TemplateController.tsx` (galería en el alta y
  acción de aplicar), `Inspector.tsx`/`LayersPanel.tsx`/`Editor.island.tsx` (panel de tema, alto de
  banda, decoración), `documentEdits.ts` (reemplazo del documento).
- **Specs que se ponen al día**: `invoice-document-model` e `invoice-renderer` incorporan lo que el
  motor ya hace desde los diseños.
- **Sin dependencias npm nuevas.** La previsualización usa el `render` que ya existe.
- **Sin migración de datos.** Los documentos guardados no cambian de forma: `rotationDeg`,
  `headerColor` y la marca de decoración tienen valor por defecto, y un documento antiguo se sigue
  validando.
- **Los cinco diseños actuales no cambian de aspecto.** Este cambio les da superficie, no los
  rediseña.

## Fuera de alcance

Este cambio **no** reabre ninguna decisión cerrada:

- **Los presets siguen siendo código**, no filas en la base de datos. Un diseño nuevo es un archivo
  en `src/invoice/templates/`, no un registro que administrar. Sin CRUD de plantillas de sistema,
  sin importar/exportar diseños, sin galería editable por el usuario.
- **No se toca el modelo del documento**: cinco bandas, milímetros, coordenadas relativas a la
  banda, tokens en vez de literales. Las dos propiedades nuevas son de dos tipos de bloque.
- **No entra un tipo de bloque nuevo.** Los diseños se arman con los que hay.
- **No hay agrupación real de bloques.** La decoración es una marca que afecta a la lista de capas
  y a la selección, no un contenedor con geometría propia ni transformaciones anidadas.
- **El documento sigue siendo presentacional.** Ningún preset introduce dominio fiscal.
- **PDF solo por impresión del navegador.** La previsualización de la galería es HTML; no aparece
  ningún endpoint de render a imagen ni Chrome headless para generar miniaturas.
- **El embed no cambia.** Sigue autocontenido, sin estilos de aplicación, y sus parámetros se siguen
  validando contra el schema que declara el propio documento.
- **No se decide la autenticación.** `/templates` sigue con el hueco de `@uiMiddleware` documentado.
- **No entra la subida de assets**, que sigue siendo el cambio `asset-upload`: los presets siguen
  refiriendo su logo por token y se ven sin imagen hasta que haya una.
