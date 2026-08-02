## Why

Hay cinco diseños de factura terminados y un editor para hacer más, pero **no hay ninguna factura**.
Lo único que se guarda hoy es el diseño. Los datos viven en `Handoff`, una entidad con
`HANDOFF_TTL_MS = 10 minutos` y un cron que la borra: existe para que el embed pinte sin meter los
datos en el query string, no para recordar nada. Se puede diseñar la factura perfecta y no se puede
emitir una.

Falta también la superficie: para ver una factura con datos de verdad hay que hacer un POST al
endpoint del handoff. No hay ningún sitio donde una persona escriba un cliente, añada tres líneas y
la imprima.

Y hay una propiedad que el trabajo de los diseños dejó servida sin que se note: **los cinco presets
comparten un único `INVOICE_DATA_SCHEMA`**. Eso significa que los datos de una factura ya sirven
para pintarla con cualquiera de los cinco papeles. La factura no está casada con su diseño; sólo
falta el `<select>` que lo aproveche.

## What Changes

- **Aparece la factura como entidad, y guarda sólo datos.** Cliente, líneas, totales, el diseño con
  el que se pinta por defecto y los parámetros del embed. Nada más.
- **No se guarda ningún PDF, ni ningún HTML renderizado.** El papel se vuelve a pintar cada vez a
  partir de los datos y de la plantilla **tal y como está hoy**. Es lo que permite retocar un diseño
  y que las facturas viejas salgan con el retoque.
- **El formulario se deriva del `dataSchema` del documento**, no se escribe a mano por diseño.
  Los caminos que empiezan por `item.` son las columnas de cada línea; el resto son campos de la
  factura. Esa distinción ya existe en el código (`isItemPath`). Una plantilla nueva trae su
  formulario sin que nadie lo programe.
- **Visualizador en vivo al lado del formulario**, con el mismo `render` que pinta el embed. Sin
  viaje al servidor: el render es isomorfo y ya corre en el navegador en el lienzo del editor.
- **El diseño se cambia sobre la marcha** desde el visualizador, entre los diseños compatibles.
- **La impresión sale del diálogo del navegador.** Al imprimir se ve el papel y sólo el papel: el
  formulario y el resto del chrome desaparecen.
- **El número de factura lo teclea la persona.** Sin secuencia, sin reserva, sin estados. Si el
  número ya existe, se avisa al lado del campo y se sigue: es un aviso, nunca un impedimento.
- **Los totales son datos, no valores derivados.** El formulario multiplica cantidad por precio
  como comodidad y **escribe el resultado en los campos**, que siguen siendo editables. El servidor
  guarda lo que recibe y el render pinta lo que hay. Un solo sitio hace aritmética de dinero, así
  que la pantalla y la base de datos no pueden discrepar.
- **Se avisa cuando una factura guardada ya no encaja con su plantilla.** Si alguien reenlaza un
  texto a otro camino, los datos viejos se quedan como estaban; abrir esa factura dice qué campos
  quedaron huérfanos en vez de imprimirlos en blanco sin decir nada.

## Capabilities

### New Capabilities

- `invoice-records`: la factura como registro de datos. Qué guarda y qué no, el formulario derivado
  del schema, el visualizador en vivo, el cambio de diseño, la impresión y la detección de datos que
  ya no encajan con la plantilla.

### Modified Capabilities

Ninguna. `invoice-embed`, `invoice-renderer`, `invoice-document-model`, `invoice-data-binding`,
`template-editor` y `template-presets` se usan tal cual, sin cambiar ningún requisito.

## Impact

- **Entidad nueva**: `Invoice` con su repositorio, en `src/invoice/models/invoice/`.
- **Controlador nuevo**: las vistas de lista, alta y edición de facturas, y sus acciones.
- **UI nueva**: el formulario derivado del schema, la lista de líneas, el visualizador y el selector
  de diseño.
- **`Handoff` no se toca.** Convertirlo en un puntero a la factura es una simplificación real, pero
  su acción de preparación es pública y ese cambio merece su propio cambio, no ir de polizón.
- **Sin dependencias npm nuevas.** La aritmética de líneas se hace en céntimos enteros; `Money` y
  `big.js` viven en la raíz del framework y no pueden entrar en un island.
- **Sin migración.** Es una entidad que antes no existía.

## Fuera de alcance

Este cambio **no** reabre ninguna decisión cerrada:

- **PDF sólo por impresión del navegador.** No aparece ningún endpoint de PDF, ni Chrome headless,
  ni Gotenberg, ni fuentes embebidas. «Guardar en PDF» es el botón del diálogo de Ctrl+P.
- **No se archiva el papel.** No se guarda el HTML renderizado ni una copia del diseño con el que se
  imprimió. Es una decisión, no un olvido: es exactamente lo que permite cambiar el diseño después.
- **El documento sigue siendo presentacional, no fiscal.** Sin XML, sin firma digital, sin QR/CUFE,
  sin catálogos SRI/DIAN/CFDI, sin series ni numeración automática, sin estados de emisión, sin
  libro de facturas. El número es un campo de texto.
- **No se toca el modelo del documento ni el motor de render**: cinco bandas, milímetros,
  coordenadas relativas a la banda, tokens en vez de literales.
- **No entra ningún tipo de bloque nuevo.**
- **No hay cálculo de impuestos.** El formulario multiplica cantidades por precios; los impuestos
  los escribe la persona. Ningún tipo impositivo, ninguna regla por país.
- **No se decide la autenticación.** `/invoices` sigue con el mismo hueco de `@uiMiddleware` que
  `/templates`, y ninguna vista se marca `static`.
- **No entra la subida de assets**, que sigue siendo el cambio `asset-upload`.
- **No hay envío por email ni compartición externa.** Imprimir es la salida.
