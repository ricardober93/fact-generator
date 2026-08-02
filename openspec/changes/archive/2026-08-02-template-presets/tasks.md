## 1. Poner en spec lo que el motor ya hace

- [x] 1.1 Comprobar que `box` declara `rotationDeg` en su schema con defecto `0` y que la rotación
      gira alrededor del centro sin tocar `xMm`/`yMm`/`widthMm`/`heightMm`.
- [x] 1.2 Comprobar que `table` declara `headerColor` con defecto igual al token de `color`, y que
      solo afecta a la cabecera que proyecta en `detailHeader`.
- [x] 1.3 Cambiar `pageCss(page)` a `pageCss(page, theme)` y emitir la regla de filas alternas
      **solo** si el tema declara `rowAltFill`. Actualizar el único llamador, `render.tsx`.
- [x] 1.4 `printCss.unit.test.ts`: con `rowAltFill` la regla está; sin él, no; la petición de color
      exacto va dentro de `@media print` y no fuera.
- [x] 1.5 `render.unit.test.ts`: con cuatro ítems, tema con relleno alterno y un bloque de `detail`
      cuyo relleno referencia `@rowFill`, las filas 1 y 3 pintan con el relleno y la 2 y la 4 con el
      alterno.
- [x] 1.6 Comprobar que `format.unit.test.ts` cubre los tres escenarios de fecha: `YYYY-MM-DD` sin
      desplazamiento, valor con hora sin cambio de interpretación, y valor que no es fecha.
- [x] 1.7 Rellenar los defectos de bloque al leer un documento guardado, para que añadir una
      propiedad al schema de un tipo no invalide lo ya almacenado: `withBlockDefaults` en el
      registro, aplicado en el getter `Template.doc`, con su test.

## 2. El campo de decoración

- [x] 2.1 Añadir `decorative?: boolean` opcional a `IBlock` en `render/document.ts`.
- [x] 2.2 Confirmar que `validateDocument` acepta el campo sin cambios y que el render lo ignora:
      **no** tocar `bands.tsx` ni ningún archivo de `blocks/`.
- [x] 2.3 Marcar como decorativos los bloques del mosaico y los chevrones en sus constructores.
- [x] 2.4 Test: un documento con bloques marcados valida igual, y su marcado renderizado es idéntico
      al del mismo documento sin marcas.

## 3. Metadata del catálogo

- [x] 3.1 `ITemplatePreset` gana `description` y `family`; rellenarlas en los cinco diseños.
- [x] 3.2 Ampliar `presets.unit.test.ts`: toda entrada tiene nombre y descripción no vacíos y una
      familia; los identificadores siguen siendo únicos y resolubles.
- [x] 3.3 Test: construir el mismo diseño dos veces produce documentos iguales.

## 4. La galería en el alta de plantilla

- [x] 4.1 Componente de tarjeta: `render()` con `sampleDataFor` del propio documento, dentro de un
      contenedor con `overflow: hidden` y `transform: scale(k)`. **Sin `pageCss`.**
- [x] 4.2 Sustituir el `<select>` del formulario por la galería de radios, con la tarjeta «En
      blanco» de `value=""` primera. El `@action` no cambia de firma.
- [x] 4.3 Estilos de la galería con los tokens del sistema de diseño; nada de valores sueltos.
      Etiqueta asociada y anillo de foco visible en cada tarjeta.
- [x] 4.4 Test de controlador con `createUiHarness`: el alta muestra una tarjeta por diseño más la
      de en blanco, y el marcado de cada tarjeta contiene el documento renderizado.
- [x] 4.5 Test: la vista de alta **no** contiene ninguna regla `@page`.
- [x] 4.6 Comprobar que siguen valiendo los tests de alta ya existentes: con diseño se guarda ese
      documento, con diseño desconocido es 400 y no se crea nada, sin diseño se crea en blanco.

## 5. El panel de tema

- [x] 5.1 Función pura que dice si un valor de token parece un color CSS, con su `*.unit.test.ts`:
      `#rrggbb`, `#rgb`, `rgb()/rgba()/hsl()`; una pila tipográfica no lo es.
- [x] 5.2 Panel que lista `doc.theme` y edita cada valor con `setThemeToken`: campo de texto siempre
      —fuente de verdad— y muestra `<input type="color">` solo cuando el valor parece color.
- [x] 5.3 El panel no ofrece añadir ni borrar tokens.
- [x] 5.4 Colocarlo en el chrome del editor sin desplazar el inspector de bloque.
- [x] 5.5 Tests: el panel lista todos los tokens del tema de `bars-navy`; cambiar `accent` cambia el
      tema y **ningún** bloque; el cambio se deshace con el historial del store.

## 6. El alto de banda

- [x] 6.1 Cuando hay banda seleccionada y no hay bloque, el inspector muestra el alto de la banda en
      milímetros en vez del texto de «selecciona un bloque».
- [x] 6.2 Conectar el control con `setBandHeight`, ya existente y ya probado.
- [x] 6.3 Tests: fijar el alto cambia la banda; reducirlo reencuadra el bloque que sobresalía; un
      alto de 0 o no numérico deja el documento intacto.

## 7. La decoración en el editor

- [x] 7.1 `LayersPanel`: agrupar los bloques decorativos de la banda en una única entrada plegable,
      y seguir listando uno por fila los demás.
- [x] 7.2 Desde la entrada desplegada se selecciona un bloque decorativo y su inspector lo edita con
      normalidad.
- [x] 7.3 El picking del lienzo salta los bloques decorativos; la selección por área los sigue
      alcanzando.
- [x] 7.4 Tests: con la cabecera de `mosaic-red` seleccionada la lista de capas tiene una entrada de
      decoración y una fila por bloque no decorativo; un clic sobre un bloque decorativo no cambia
      la selección; un documento sin marcas se comporta igual que antes.

## 8. Aplicar un diseño a una plantilla abierta

- [x] 8.1 Control en el editor que ofrece los diseños del catálogo.
- [x] 8.2 Al elegir uno, pedir confirmación y hacer `store.commit(preset.build())`.
- [x] 8.3 Tests: aplicar sustituye el documento y valida; deshacer devuelve el anterior completo;
      cancelar no cambia nada; aplicar no escribe en el repositorio.
- [x] 8.4 Comprobar que el bundle del island sigue construyendo —`templates/` solo importa de
      `render/`, nunca de la raíz del framework—.

## 9. Cierre

- [x] 9.1 Regenerar el golden fixture si el marcado cambió, y revisar el diff línea a línea.
- [x] 9.2 Verificación visual de los cinco diseños en la galería y en el editor.
- [x] 9.3 `npm run tsc`, `npm run test:unit` y `npm run fmt:check` en verde.
- [x] 9.4 Ningún archivo por encima de 250 líneas y ninguna función por encima de 25 —salvo los
      componentes JSX y las listas declarativas de bloques, que es el caso especial que ya sigue
      todo el editor—.
- [x] 9.5 Separar `pageCss(page)` de `documentCss(theme)` y dar a `render()` un `pageRules: false`,
      porque `render()` emite siempre su `<style>` y la galería habría metido cinco `@page` en la
      lista de plantillas.
