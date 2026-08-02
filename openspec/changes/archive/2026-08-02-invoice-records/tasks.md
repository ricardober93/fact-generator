## 1. La entidad

- [x] 1.1 `models/invoice/Invoice.ts`: entidad con `templateId`, `data`, `items` y `params`. Sin
      `token`, sin `expiresAt`, sin nada del papel.
- [x] 1.2 `models/invoice/InvoiceRepository.ts` con `createInvoice` y `saveInvoice`, que validan los
      obligatorios con `missingRequiredPaths` contra la plantilla y fallan con 400 nombrando los
      caminos que faltan.
- [x] 1.3 Buscar por número para avisar de repetidos. **Sin `@query`**: el número vive en
      `data.factura.numero`, anidado dentro del blob de la entidad, y el DSL de `@query` consulta
      campos de primer nivel. Se resuelve con `findAll` + filtro, que es además el acceso que ya
      necesita la lista. `ponytail:` O(n) sobre las facturas; si algún día pesa, toca
      `@queryExtension` con implementación por adaptador.
- [x] 1.4 Tests con `useMemoryRepositories`: se guarda lo que se manda; faltando un obligatorio no se
      guarda nada; los totales se guardan tal cual aunque no cuadren con las líneas.

## 2. Encaje entre una factura y su plantilla

- [x] 2.1 Función pura que devuelve el desajuste entre los datos de una factura y el `dataSchema` de
      una plantilla: los caminos que la plantilla pide y la factura no tiene, y los que la factura
      guarda y la plantilla ya no usa.
- [x] 2.2 Función pura que dice si una plantilla admite los datos de una factura —sin obligatorios
      que falten—, para el selector de diseño.
- [x] 2.3 Tests: sin desajuste devuelve vacío; camino nuevo obligatorio se reporta; camino
      reenlazado deja el dato huérfano y se reporta; los cinco presets se admiten entre sí.

## 3. Aritmética de la factura

- [x] 3.1 Módulo puro en céntimos enteros: importe de línea a partir de cantidad y precio, suma de
      líneas, y total a partir de base e impuestos.
- [x] 3.2 Dejar constancia del supuesto de dos decimales y su vía de salida. **No en el código**:
      CLAUDE.md prohíbe comentarios, así que la nota vive en `design.md`, donde ya está escrita.
- [x] 3.3 Tests: `0.1 + 0.2` da `0.30`; cantidad fraccionaria redondea al céntimo; una lista vacía
      suma cero.

## 4. El formulario derivado del schema

- [x] 4.1 Función pura que parte el `dataSchema` en campos de factura y columnas de línea usando la
      raíz de ítem, con su test.
- [x] 4.2 Control por tipo declarado: texto, número, fecha y casilla; los obligatorios marcados.
- [x] 4.3 Agrupar los campos por el primer segmento del camino (`emisor`, `cliente`, `factura`).
- [x] 4.4 Lista de líneas: añadir, quitar y reordenar, sin tocar los valores de las demás.
- [x] 4.5 Al escribir cantidad o precio, rellenar el importe de la línea; al cambiar las líneas,
      rellenar la base y el total. Todos siguen siendo editables.
- [x] 4.6 Etiquetas asociadas a su campo y anillo de foco visible, como en el editor.
- [x] 4.7 Tests: los campos salen del schema; un camino de ítem es columna y no campo; añadir una
      plantilla con un camino nuevo hace aparecer su campo; quitar una línea del medio respeta las
      otras; escribir cantidad y precio rellena el importe; un importe escrito a mano se conserva.

## 5. El visualizador en vivo

- [x] 5.1 Island único con el estado en signals que pinta formulario y papel, sin sincronizar dos
      islands.
- [x] 5.2 Componente del papel: `render({ doc, data, items, params, assets })` en un contenedor con
      ancho en milímetros, sin gestos de edición.
- [x] 5.3 Cargar los URIs de los assets con `assetsFor`, o el logo sale vacío.
- [x] 5.4 Tests: escribir en el formulario cambia el marcado del papel sin guardar; el marcado
      coincide con el que produce el embed para los mismos datos.

## 6. El selector de diseño

- [x] 6.1 Selector en el visualizador con las plantillas que admiten los datos de la factura.
- [x] 6.2 Cambiar de diseño repinta y no toca ningún dato; la plantilla elegida se guarda.
- [x] 6.3 Tests: la misma factura se pinta con otro diseño y sus datos no cambian; al reabrir se
      pinta con el diseño guardado.

## 7. Las páginas

- [x] 7.1 `InvoiceController` con `@uiController({ path: '/invoices', app: true, layout: AppLayout })`.
- [x] 7.2 Vista de lista: número, cliente, total y fecha por fila, enlace a la factura, estado vacío
      que ofrece crear la primera.
- [x] 7.3 Vista de alta y de edición con el formulario y el visualizador al lado.
- [x] 7.4 Elegir plantilla al crear. **Sin la galería de `template-presets`**: aquélla elige un
      _diseño de partida_ para una plantilla nueva; aquí se elige entre plantillas ya guardadas, y
      son cosas distintas. El alta toma la primera plantilla y se cambia desde el selector del
      visualizador, que es donde se ve el efecto.
- [x] 7.8 El aviso de desajuste sólo aplica a facturas guardadas. Una factura nueva y vacía «no
      encaja» trivialmente con cualquier diseño; enseñárselo al usuario nada más entrar es ruido.
- [x] 7.9 El visualizador deja fuera las líneas a medio escribir en vez de dejar de pintar. Con
      `item.descripcion` e `item.total` obligatorios, añadir una línea vacía hacía desaparecer el
      papel entero. Guardar sigue siendo estricto: el repositorio las rechaza.
- [x] 7.5 Al abrir una factura con desajuste, mostrar qué caminos no encajan sin tocar los datos.
- [x] 7.6 Aviso de número repetido junto al campo, que no impide guardar.
- [x] 7.7 Tests de controlador con `createUiHarness`: la lista muestra las facturas y el estado
      vacío; guardar con un número repetido avisa y guarda; abrir una factura desajustada avisa y
      abre.

## 8. Imprimir

- [x] 8.1 Regla `@media print` que oculta el formulario y la barra de herramientas.
- [x] 8.2 Devolver a 1 cualquier escala de pantalla al imprimir, o se imprime un A4 reducido dentro
      de otro.
- [x] 8.3 Comprobar en el navegador la vista previa de impresión de los cinco diseños: sale el papel
      solo, a tamaño, con sus colores.
- [x] 8.4 Test: la página declara la regla que esconde el chrome; no existe ninguna ruta de facturas
      que devuelva un PDF.

## 9. Cierre

- [x] 9.1 Comprobar que `Handoff`, el embed y el editor siguen intactos. Único cambio en
      `HandoffRepository`: su guarda privada `assertDataSatisfiesTemplate` se extrae a
      `models/requiredData.ts` para que la comparta la factura —mismo comportamiento, una sola
      guarda en vez de dos copias que puedan divergir—. Ni la entidad ni la acción pública cambian.
- [x] 9.2 `npm run tsc`, `npm run test:unit` y `npm run fmt:check` en verde.
- [x] 9.3 Ningún archivo por encima de 250 líneas y ninguna función por encima de 25, con el mismo
      criterio de caso especial que sigue el resto del editor.
- [x] 9.4 Comprobar que el bundle del island construye: nada de `models/` ni de la raíz del framework
      viaja al navegador.
