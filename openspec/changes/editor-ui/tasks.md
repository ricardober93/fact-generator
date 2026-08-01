## 1. Incorporar el sistema de diseño

- [x] 1.1 Crear `src/design/` y añadir el script `design:sync` a `package.json`: descarga
      `https://design.wabot.dev/assets/colors_and_type.css` a `src/design/wabot-design.css` y
      genera `src/design/wabotDesignCss.ts`, que exporta el CSS como cadena.
- [x] 1.2 El generador debe producir TypeScript válido con el CSS escapado, sin `any`, y ser
      idempotente: ejecutarlo dos veces no cambia el archivo.
- [x] 1.3 Crear `src/design/wabot-design.overrides.css` —vacío de inicio— y concatenarlo **después**
      del sistema en el módulo generado, para que una actualización nunca pise las
      personalizaciones.
- [x] 1.4 Sobreescribir `--font-sans` con la pila del sistema en el archivo de overrides y **no**
      servir los `woff2` de Geist: sus `@font-face` son rutas relativas que darían 404 al inyectar
      el CSS en un `<style>`.
- [x] 1.5 Comprobar que ni el CSS generado ni los overrides referencian ninguna URL externa.
- [x] 1.6 `design.unit.test.ts`: el módulo generado exporta una cadena no vacía; contiene los
      tokens `--c-bg`, `--c-fg` y `--c-action`; los overrides van después del sistema; y no hay
      ninguna `url(http…)` ni `@import` externo.

## 2. La cáscara de la aplicación

- [x] 2.1 Crear `src/invoice/ui/AppLayout.tsx`: inyecta el CSS una sola vez con
      `<style dangerouslySetInnerHTML>` y renderiza `<Outlet/>`.
- [x] 2.2 Pasarlo a `@uiController({ path: '/templates', app: true, layout: AppLayout })`, que es
      lo que faltaba para que `app: true` tuviera cáscara persistente.
- [x] 2.3 Comprobar que el CSS se inyecta **una** vez por página, no una por vista.
- [x] 2.4 **No tocar `EmbedController`**: el embed no lleva layout ni sistema de diseño.
- [x] 2.5 Prueba: una vista de `/templates` contiene el sistema de diseño; la del embed no
      contiene ninguno de sus tokens.

## 3. El aislamiento del documento

- [x] 3.1 Marcar el contenedor del documento en el lienzo con un atributo propio, sin tocar el
      marcado que emite `render/`.
- [x] 3.2 Añadir en el archivo de overrides únicamente las reglas que hagan falta para que dentro
      de ese contenedor no llegue lo heredable del sistema —`font-family`, `color`, `line-height`—,
      y nada más: `render/` ya gana en lo demás porque pinta en línea.
- [x] 3.3 Comprobar en el navegador que los estilos computados de los mismos nodos coinciden en el
      editor y en el embed: familia, color, tamaño y rectángulo de cada bloque.
- [x] 3.4 Dejar constancia de lo que se escapaba antes de la regla, para que la regla no sea
      preventiva sino justificada.

## 4. La barra y la cáscara del editor

- [x] 4.1 Crear el módulo CSS de la rejilla: tres columnas, scroll por panel y colapso responsive.
      Es el **único** módulo CSS del cambio.
- [x] 4.2 Rehacer la barra: «Guardar» como acción primaria en píldora oscura, «Deshacer» y
      «Rehacer» como secundarios. Sentence case. Sin sombras, sin bordes, sin cambios al pasar el
      ratón.
- [x] 4.3 El estado de guardado pasa a badge con punto: guardado, guardando, conflicto y error.
      Conservar el gancho `data-save-state`.
- [x] 4.4 La revisión se muestra como metadato en mono.
- [x] 4.5 Quitar el `boxShadow` del papel; separar por contraste: lienzo hundido, papel blanco.
- [x] 4.6 El papel se queda blanco siempre, fuera del tema de la aplicación, porque representa una
      hoja impresa.

## 5. Paleta e inspector

- [x] 5.1 Rehacer la paleta con las primitivas de layout y los botones del sistema; conservar
      `data-palette-kind` y el estado deshabilitado sin banda seleccionada.
- [x] 5.2 Selector de banda como campo etiquetado del sistema.
- [x] 5.3 Rehacer el inspector con `fieldset`, `legend`, `label` e `input` del sistema; conservar
      `data-geometry` y el resto de ganchos.
- [x] 5.4 Los cuatro campos de geometría en una rejilla de dos columnas que no desborde su panel.
- [x] 5.5 Estado vacío del inspector como frase plana, sin ilustración ni párrafo de bienvenida.
- [x] 5.6 Borrar los 35 objetos `style={{…}}` del chrome. Solo pueden quedar los geométricos
      calculados de la capa de selección.

## 6. Iconos

- [x] 6.1 Crear `src/invoice/ui/icons.tsx` con `arrow-up`, `arrow-down` y `x` de Lucide copiados
      como SVG en línea, 24×24, trazo 2, extremos redondeados. Sin dependencia npm.
- [x] 6.2 Sustituir `↑ ↓ ×` en `TextContentEditor.tsx` y dar a cada botón su nombre accesible.
- [x] 6.3 Comprobar que no queda ningún carácter unicode ni emoji haciendo de icono en `ui/`.

## 7. El índice de plantillas

- [x] 7.1 Rehacer el índice como tabla del sistema: nombre, revisión y enlace al editor.
- [x] 7.2 El alta como formulario del sistema, con su etiqueta y su botón de envío.
- [x] 7.3 Estado vacío plano —«Todavía no hay plantillas.»— con el formulario debajo.
- [x] 7.4 Prueba: sin plantillas aparece el estado vacío; con plantillas aparecen sus filas.

## 8. Cierre

- [x] 8.1 `npm run tsc` sin errores.
- [x] 8.2 `npm run test:unit` en verde. **Las 60 pruebas anteriores deben pasar sin editarlas**:
      si alguna se rompe, el rediseño cambió comportamiento y hay que corregir el rediseño.
- [x] 8.3 `npm run fmt`.
- [x] 8.4 Ningún archivo pasa de 250 líneas ni ninguna función de 25.
- [x] 8.5 Comprobar que `render/` sigue sin importar la raíz del framework y que **no se ha
      modificado ningún archivo de `render/`** en este cambio.
- [x] 8.6 Arrancar `npm run dev` y comprobar en el navegador: el editor con el sistema aplicado,
      foco visible al tabular, la rejilla colapsando en una ventana estrecha, y los iconos en su
      sitio. Sin errores de consola.
- [x] 8.7 Comparar los estilos computados del documento entre el editor y el embed y dejar el
      resultado por escrito.
- [x] 8.8 Comprobar que Ctrl+P del embed sigue produciendo la factura igual que antes del cambio.

      **Resultado de 8.6, 8.7 y 8.8, comprobado en Chromium contra `npm run dev`:**

      - **Aislamiento (8.7):** con el mismo documento y los mismos datos, se compararon **54 nodos
        × 30 propiedades = 1620 comparaciones** entre el lienzo y el embed. **Cero diferencias.**
        Antes de la regla eran **20 diferencias**: `line-height` en los ocho bloques de texto
        (20,67 px heredados de `body` frente a `normal`), y `font-family`, `font-size` y `color`
        en el bloque `image`, cuyo hijo no declara ninguno de los tres. La primera versión de la
        regla dejó pasar además el **zebra de la tabla** —la banda `detail` se pintaba con fondo
        gris en el editor y transparente en el embed—, que la sonda no vio porque
        `background-color` no estaba en su lista de propiedades.
      - **Foco (8.6):** al tabular, el control enfocado casa `:focus-visible` y muestra el anillo
        del sistema: `2px solid rgb(238, 91, 41)` con `outline-offset: 2px`.
      - **Etiquetado:** los once campos del inspector y la paleta tienen `label[for]` o
        `aria-label`. Los tres botones de icono exponen su nombre y no contienen texto.
      - **Iconos:** no queda ningún `↑ ↓ ×` en la interfaz.
      - **Responsive:** el módulo sirve el punto de corte `(max-width: 60rem)`; aplicando sus
        declaraciones, la rejilla pasa a una columna, los paneles ocupan el ancho y no hay
        desbordamiento horizontal.
      - **Impresión (8.8):** el embed sigue sin CSS de aplicación y conserva su regla
        `@media print` del pie. Ctrl+P no se ejecuta desde la automatización porque el diálogo de
        impresión bloquea todos los eventos del navegador.
      - Sin errores ni avisos de consola tras recargar.

## 9. Desviaciones

- **9.1 Un módulo CSS no sirve: se filtra a todas las páginas.** El framework inyecta **todos** los
  módulos CSS registrados en **cada** página renderizada, así que `editor.module.css` acabó en el
  embed —comprobado en el servidor real, no solo en el harness—, rompiendo la decisión cerrada de
  que el embed es autocontenido. Se elimina el módulo: el CSS del chrome viaja como cadena en
  `ui/editorCss.ts` y lo inyecta el layout, igual que el sistema de diseño. Las clases pasan a
  llevar prefijo `wb-`. **Sustituye a la decisión 7 del diseño.**
- **9.2 El sistema de diseño va en una capa de cascada.** El reset del lienzo tenía que ganar a
  `tbody tr:nth-child(odd) td`, de especificidad (0,1,3), y el sistema llega hasta (0,3,1). En vez
  de subir especificidad a base de repetir el selector —frágil ante cualquier regla nueva—, el CSS
  descargado se envuelve en `@layer wabot-design` y el reset queda sin capa: lo no-capado gana a lo
  capado sea cual sea su especificidad.
- **9.3 El reset es de subárbol completo, no solo de lo heredable.** La decisión 3 preveía
  neutralizar `font-family`, `color` y `line-height`. No bastaba: el zebra de la tabla se aplica
  directamente a `td`, que no se hereda. La regla final es
  `[data-document-surface] * { all: revert }`, que devuelve el subárbol al estilo del navegador —el
  entorno exacto del embed— y no toca las propiedades personalizadas, así que los tokens del tema
  sobreviven. Los estilos en línea de `render/` siguen ganando.
- **9.4 Los `@font-face` se eliminan al sincronizar.** En vez de dejar reglas que apuntarían a
  rutas relativas inexistentes, el script las quita del CSS descargado. El resultado no contiene
  ninguna URL externa, y el test lo afirma.
- **9.5 La revisión del índice se muestra como badge `rev N`.** La prueba existente afirmaba el
  texto «rev 1»; en vez de editarla —lo que la tarea 8.2 prohíbe—, la celda pasa a un badge que se
  describe a sí mismo, que además se lee bien cuando la cabecera se pierde de vista.
- **9.6 El colapso responsive se verificó aplicando sus declaraciones.** Redimensionar la ventana
  desde la automatización no cambió el viewport de renderizado, así que se comprobó el efecto de
  las reglas del punto de corte, la misma técnica que se usó para la regla de impresión.
- **9.7 Los tokens del embed caducan a los diez minutos**, lo que interrumpió una de las medidas de
  paridad. Es el TTL del handoff funcionando, no un defecto.
- **9.8 `validateDocument.ts` sigue con 333 líneas**, por encima del límite de 250. Es anterior a
  este cambio y no se ha tocado.
