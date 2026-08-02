## Why

El editor funciona, pero no está diseñado. Hoy son **35 objetos `style={{…}}` repartidos por siete
archivos**, controles del navegador sin tocar, una sombra bajo el papel, tres glifos unicode
(`↑ ↓ ×`) haciendo de iconos y un panel de propiedades que hasta hace dos commits se salía de la
columna. No hay escala tipográfica, ni escala de espaciado, ni jerarquía: todo el texto pesa lo
mismo y todo el gris es un gris distinto elegido a ojo.

El proyecto ya tiene un sistema de diseño propio (`wabot-design`) con tokens de color, tipografía,
espaciado y radios, y componentes accesibles. Está publicado y es alcanzable (26 kB). Adoptarlo
sustituye decisiones estéticas improvisadas por un sistema, y de paso borra las 35 decisiones
sueltas que hoy hay que mantener a mano.

Hay una razón menos evidente y más importante para hacerlo **ahora**: en cuanto entra una hoja de
estilo global, el documento de la factura pasa a compartir página con ella. La factura del lienzo
tiene que seguir viéndose exactamente igual que la del embed, que no lleva sistema de diseño. Ese
aislamiento es más fácil de establecer con un solo consumidor que con cinco.

## What Changes

- **El sistema de diseño se incorpora al proyecto**, no se enlaza en tiempo de ejecución. Un
  script lo descarga y genera un módulo TypeScript con el CSS, que el layout inyecta una vez. Sin
  CDN, sin `fetch` en runtime, sin depender de la red para arrancar.
- **Un `AppLayout` con `<Outlet/>`** para `/templates`, que es lo que el controlador ya pedía al
  declararse `app: true`: la cáscara persiste entre navegaciones y sus islands conservan estado.
- **Las 35 declaraciones en línea desaparecen** del chrome del editor. Quedan las clases globales
  del sistema y **un** módulo CSS para la rejilla de tres columnas. El render del documento
  **no se toca**: sus estilos en línea son lo que hace al embed autocontenido.
- **El lienzo queda aislado de los estilos de la aplicación.** El documento debe pintarse igual en
  el editor que en el embed; se verifica comparando estilos computados, no confiando en que sí.
- **Iconos de Lucide en SVG en línea** en lugar de `↑ ↓ ×`. Es una sustitución: el sistema de
  diseño prohíbe unicode y emoji como iconografía.
- **Fuera la sombra del papel.** La separación pasa a ser por contraste de fondo, que es la regla
  del sistema.
- **La barra, la paleta y el inspector se rehacen** con botones, campos, `fieldset`, badges con
  punto de estado y las primitivas de layout del sistema. El estado de guardado deja de ser un
  `<span>` de color y pasa a ser un badge con punto.
- **El índice de plantillas** pasa a tabla del sistema, con estado vacío plano y el alta como
  formulario, en vez de la lista `<ul>` actual.
- **Accesibilidad que hoy no existe**: anillos de foco visibles, campos asociados a su etiqueta,
  y los botones de icono con nombre accesible.
- **La rejilla se adapta**: por debajo de un ancho, las tres columnas dejan de ser tres.

## Capabilities

### New Capabilities

Ninguna. Este cambio viste una superficie que ya está especificada.

### Modified Capabilities

- `template-editor`: gana requisitos sobre su presentación —de dónde sale el sistema de diseño y
  que nunca viaja al embed—, sobre el **aislamiento visual del documento respecto a los estilos de
  la aplicación**, y sobre foco, etiquetado e iconografía. Ningún requisito de comportamiento
  existente cambia: arrastre, inspector, guardado y deshacer siguen igual.

## Impact

- **Código nuevo**: `src/design/` (el CSS descargado y el módulo generado), `AppLayout`, un módulo
  CSS para la rejilla, y un archivo de iconos SVG.
- **Código modificado**: `Editor.island.tsx`, `Canvas.tsx`, `Palette.tsx`, `Inspector.tsx`,
  `propertyEditors.tsx`, `TextContentEditor.tsx` y `TemplateController.tsx` — marcado y clases,
  no lógica. Las pruebas que afirman `data-*` siguen valiendo porque esos ganchos no se tocan.
- **Sin dependencias npm nuevas.** Lucide entra como SVG copiado, no como paquete.
- **Sin cambios en `src/invoice/render/`.** Si algo del documento hay que retocar, se retoca en el
  motor y se ve en las dos superficies, nunca solo en el editor.
- **Un script nuevo**, `design:sync`, que actualiza el sistema de diseño y regenera el módulo.

## Fuera de alcance

Este cambio **no** reabre ninguna decisión cerrada:

- **No se toca el aspecto de la factura.** El documento se ve como diga su plantilla: sus bandas,
  sus bloques y sus tokens. El sistema de diseño viste el editor, nunca el papel.
- **El embed no lleva sistema de diseño.** Sigue sirviendo un documento autocontenido, sin CSS de
  aplicación. Es lo que garantiza que lo que se ve en el editor es lo que se imprime.
- **No hay CDN en tiempo de ejecución.** El CSS vive en el repositorio.
- **No entra ninguna librería de UI, de iconos ni de estilos.** Ni Tailwind, ni una librería de
  componentes, ni un paquete de iconos.
- **No se toca el modelo del documento ni el motor de render**: cinco bandas, milímetros,
  coordenadas relativas a la banda, tokens en vez de literales.
- **No se decide la autenticación.** `/templates` sigue con el hueco de `@uiMiddleware`
  documentado y sin marcar `static` ninguna vista.
- **No entra la subida de assets**, que sigue siendo el cambio `asset-upload`.
- **No entra dominio fiscal**, ni PDF de servidor, ni paginación en pantalla.
- **No se rediseñan las interacciones**: el arrastre, el tirador único de redimensión, la paleta
  por clic y los atajos se quedan como están. Este cambio es de presentación.
