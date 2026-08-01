## 1. Incorporar el sistema de diseño

- [ ] 1.1 Crear `src/design/` y añadir el script `design:sync` a `package.json`: descarga
      `https://design.wabot.dev/assets/colors_and_type.css` a `src/design/wabot-design.css` y
      genera `src/design/wabotDesignCss.ts`, que exporta el CSS como cadena.
- [ ] 1.2 El generador debe producir TypeScript válido con el CSS escapado, sin `any`, y ser
      idempotente: ejecutarlo dos veces no cambia el archivo.
- [ ] 1.3 Crear `src/design/wabot-design.overrides.css` —vacío de inicio— y concatenarlo **después**
      del sistema en el módulo generado, para que una actualización nunca pise las
      personalizaciones.
- [ ] 1.4 Sobreescribir `--font-sans` con la pila del sistema en el archivo de overrides y **no**
      servir los `woff2` de Geist: sus `@font-face` son rutas relativas que darían 404 al inyectar
      el CSS en un `<style>`.
- [ ] 1.5 Comprobar que ni el CSS generado ni los overrides referencian ninguna URL externa.
- [ ] 1.6 `design.unit.test.ts`: el módulo generado exporta una cadena no vacía; contiene los
      tokens `--c-bg`, `--c-fg` y `--c-action`; los overrides van después del sistema; y no hay
      ninguna `url(http…)` ni `@import` externo.

## 2. La cáscara de la aplicación

- [ ] 2.1 Crear `src/invoice/ui/AppLayout.tsx`: inyecta el CSS una sola vez con
      `<style dangerouslySetInnerHTML>` y renderiza `<Outlet/>`.
- [ ] 2.2 Pasarlo a `@uiController({ path: '/templates', app: true, layout: AppLayout })`, que es
      lo que faltaba para que `app: true` tuviera cáscara persistente.
- [ ] 2.3 Comprobar que el CSS se inyecta **una** vez por página, no una por vista.
- [ ] 2.4 **No tocar `EmbedController`**: el embed no lleva layout ni sistema de diseño.
- [ ] 2.5 Prueba: una vista de `/templates` contiene el sistema de diseño; la del embed no
      contiene ninguno de sus tokens.

## 3. El aislamiento del documento

- [ ] 3.1 Marcar el contenedor del documento en el lienzo con un atributo propio, sin tocar el
      marcado que emite `render/`.
- [ ] 3.2 Añadir en el archivo de overrides únicamente las reglas que hagan falta para que dentro
      de ese contenedor no llegue lo heredable del sistema —`font-family`, `color`, `line-height`—,
      y nada más: `render/` ya gana en lo demás porque pinta en línea.
- [ ] 3.3 Comprobar en el navegador que los estilos computados de los mismos nodos coinciden en el
      editor y en el embed: familia, color, tamaño y rectángulo de cada bloque.
- [ ] 3.4 Dejar constancia de lo que se escapaba antes de la regla, para que la regla no sea
      preventiva sino justificada.

## 4. La barra y la cáscara del editor

- [ ] 4.1 Crear el módulo CSS de la rejilla: tres columnas, scroll por panel y colapso responsive.
      Es el **único** módulo CSS del cambio.
- [ ] 4.2 Rehacer la barra: «Guardar» como acción primaria en píldora oscura, «Deshacer» y
      «Rehacer» como secundarios. Sentence case. Sin sombras, sin bordes, sin cambios al pasar el
      ratón.
- [ ] 4.3 El estado de guardado pasa a badge con punto: guardado, guardando, conflicto y error.
      Conservar el gancho `data-save-state`.
- [ ] 4.4 La revisión se muestra como metadato en mono.
- [ ] 4.5 Quitar el `boxShadow` del papel; separar por contraste: lienzo hundido, papel blanco.
- [ ] 4.6 El papel se queda blanco siempre, fuera del tema de la aplicación, porque representa una
      hoja impresa.

## 5. Paleta e inspector

- [ ] 5.1 Rehacer la paleta con las primitivas de layout y los botones del sistema; conservar
      `data-palette-kind` y el estado deshabilitado sin banda seleccionada.
- [ ] 5.2 Selector de banda como campo etiquetado del sistema.
- [ ] 5.3 Rehacer el inspector con `fieldset`, `legend`, `label` e `input` del sistema; conservar
      `data-geometry` y el resto de ganchos.
- [ ] 5.4 Los cuatro campos de geometría en una rejilla de dos columnas que no desborde su panel.
- [ ] 5.5 Estado vacío del inspector como frase plana, sin ilustración ni párrafo de bienvenida.
- [ ] 5.6 Borrar los 35 objetos `style={{…}}` del chrome. Solo pueden quedar los geométricos
      calculados de la capa de selección.

## 6. Iconos

- [ ] 6.1 Crear `src/invoice/ui/icons.tsx` con `arrow-up`, `arrow-down` y `x` de Lucide copiados
      como SVG en línea, 24×24, trazo 2, extremos redondeados. Sin dependencia npm.
- [ ] 6.2 Sustituir `↑ ↓ ×` en `TextContentEditor.tsx` y dar a cada botón su nombre accesible.
- [ ] 6.3 Comprobar que no queda ningún carácter unicode ni emoji haciendo de icono en `ui/`.

## 7. El índice de plantillas

- [ ] 7.1 Rehacer el índice como tabla del sistema: nombre, revisión y enlace al editor.
- [ ] 7.2 El alta como formulario del sistema, con su etiqueta y su botón de envío.
- [ ] 7.3 Estado vacío plano —«Todavía no hay plantillas.»— con el formulario debajo.
- [ ] 7.4 Prueba: sin plantillas aparece el estado vacío; con plantillas aparecen sus filas.

## 8. Cierre

- [ ] 8.1 `npm run tsc` sin errores.
- [ ] 8.2 `npm run test:unit` en verde. **Las 60 pruebas anteriores deben pasar sin editarlas**:
      si alguna se rompe, el rediseño cambió comportamiento y hay que corregir el rediseño.
- [ ] 8.3 `npm run fmt`.
- [ ] 8.4 Ningún archivo pasa de 250 líneas ni ninguna función de 25.
- [ ] 8.5 Comprobar que `render/` sigue sin importar la raíz del framework y que **no se ha
      modificado ningún archivo de `render/`** en este cambio.
- [ ] 8.6 Arrancar `npm run dev` y comprobar en el navegador: el editor con el sistema aplicado,
      foco visible al tabular, la rejilla colapsando en una ventana estrecha, y los iconos en su
      sitio. Sin errores de consola.
- [ ] 8.7 Comparar los estilos computados del documento entre el editor y el embed y dejar el
      resultado por escrito.
- [ ] 8.8 Comprobar que Ctrl+P del embed sigue produciendo la factura igual que antes del cambio.
