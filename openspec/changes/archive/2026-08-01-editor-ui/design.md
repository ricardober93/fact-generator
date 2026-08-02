## Context

Ver `ARCHITECTURE.md` para la frontera de `render/` y las decisiones cerradas, y el sistema de
diseño del proyecto para sus tokens y componentes. Aquí solo lo que este cambio añade.

Estado de partida, medido:

- 35 objetos `style={{…}}` en siete archivos del chrome del editor.
- `Canvas.tsx` pinta el papel con `boxShadow`, que el sistema de diseño prohíbe.
- `TextContentEditor.tsx` usa `↑ ↓ ×` como iconos, que el sistema de diseño prohíbe.
- El controlador ya declara `app: true` pero **no** aporta `layout`, así que hoy no hay cáscara
  persistente ni sitio donde inyectar una hoja de estilo una sola vez.
- Los módulos CSS funcionan: `src/css.d.ts` está puesto y el runner sirve `/_wabot/css/:file`.

Del sistema de diseño, comprobado sobre el archivo descargado (26 kB):

- Estiliza elementos desnudos: `table`, `img`, `input`, `select`, `button`, `p`, `body`…
- Sus `@font-face` cargan Geist desde rutas **relativas** (`fonts/Geist-Regular.woff2`).
- No lleva ninguna URL externa salvo esas fuentes.

## Goals / Non-Goals

**Goals:**

- Que el editor se vea diseñado, con una escala de tipografía, espaciado y color en vez de 35
  decisiones sueltas.
- Que el documento del lienzo siga siendo idéntico al del embed, ahora también en píxeles.
- Que adoptar el sistema no ate el arranque a la red.

**Non-Goals:**

- Rediseñar las interacciones del editor. Ver "Fuera de alcance" en `proposal.md`.
- Vestir el documento. El papel es del template.
- Un tema oscuro. Ver Open Questions.

## Decisions

### 1. El CSS se compila a un módulo TypeScript, no se lee del disco en runtime

`npm run design:sync` descarga `colors_and_type.css` a `src/design/wabot-design.css` y genera
`src/design/wabotDesignCss.ts`, que exporta el CSS como una cadena. El layout importa esa cadena.

_Por qué no `fs.readFileSync(new URL('./design/wabot-design.css', import.meta.url))`,_ que es lo
que sugiere el sistema de diseño: en desarrollo resuelve contra `src/`, pero el modo empaquetado
arranca desde `dist/` y nada garantiza que el `.css` se haya copiado. Un `import` de TypeScript no
tiene ese problema en ninguno de los dos modos. El coste es un archivo generado, que es el mismo
trato que ya damos al golden fixture: se regenera con un script y no se edita a mano.

Los dos archivos se tratan como generados. Las personalizaciones, si aparecen, van en
`wabot-design.overrides.css`, que es el mecanismo que el propio sistema prescribe para sobrevivir
a una actualización.

### 2. Las fuentes: pila del sistema, no Geist

Se sobreescribe `--font-sans` con la pila del sistema y **no** se sirven los `woff2` de Geist.

_Por qué:_ el `@font-face` del sistema de diseño apunta a rutas relativas. Al inyectar el CSS en
un `<style>`, esas rutas se resuelven contra la URL de la página, no contra la del archivo, así
que darían 404. Servirlas de verdad exige una ruta de assets estáticos que este proyecto no tiene:
`express.static('/_wabot')` solo se monta en modo empaquetado, no en `npm run dev`.

Las alternativas y su precio, para que la decisión se pueda revisar con datos:

- _Empotrar las fuentes como `data:` URIs_ en el CSS generado: funciona en los dos modos y sin red,
  pero mete ~100 kB de base64 en cada carga de página y complica el script de sync.
- _Añadir una ruta que sirva los binarios_: es una superficie nueva por un detalle tipográfico.

La pila del sistema cuesta cero y en macOS es SF Pro, que es exactamente el registro que busca
Geist. **Es una diferencia visible respecto al sistema de diseño y queda anotada como tal.**

### 3. El lienzo se aísla, y el aislamiento se comprueba

El documento se pinta dentro de un contenedor marcado, y una hoja de overrides neutraliza dentro
de él lo que el sistema de diseño impone a elementos desnudos.

_Por qué hace falta y por qué casi no hace falta:_ `render/` pinta **todo en línea** —es lo que
hace al embed autocontenido—, y un estilo en línea gana a una regla de hoja. Así que hoy el riesgo
real es pequeño: `table { width: 100% }` choca con un `width: 100%` en línea, `img { display:
block }` con un `display: block` en línea. Empatan y gana el documento.

Lo que no está protegido es lo **heredable**: `body` fija `font-family` y `color`, y cualquier
elemento del documento que no los declare los hereda. Hoy los bloques de texto los declaran; un
tipo de bloque futuro podría no hacerlo, y entonces el editor y el embed divergirían en silencio.

Por eso el requisito no es "poner un reset" sino "el documento se ve igual en las dos superficies",
y se verifica **comparando los estilos computados** de los mismos nodos en el editor y en el embed.
Un reset preventivo enorme sería adivinar; la comparación detecta lo que de verdad se escapa.

_Alternativa descartada:_ pintar el lienzo dentro de un `<iframe>`, que aísla de forma total y
gratuita. Rompe el hit-testing del arrastre —habría que mapear coordenadas a través de la frontera
y reenviar eventos— y obligaría a que el editor consumiera la ruta del embed, que exige un handoff
con datos. Mucho aparato para un problema que una comparación de estilos deja cerrado.

### 4. Qué es un estilo en línea legítimo después de este cambio

Se borran los 35 del chrome. Sobreviven dos clases de estilo en línea, y son las correctas:

- **Los de `render/`**, que son el documento y deben viajar con él.
- **Los geométricos calculados del overlay de selección**, que son posiciones en píxeles medidas
  en tiempo de ejecución. Una clase no puede expresar `left: 524.3px`.

El resto —color, tipografía, espaciado, radios— sale de tokens.

### 5. El papel no es una superficie del sistema de diseño

El lienzo queda sobre un fondo hundido (`--c-bg-sunken`) y el papel es blanco, sin sombra y sin
borde. El contraste de fondo hace de separación, que es la regla del sistema.

_Por qué el papel es blanco fijo y no `--c-bg-raised`:_ el papel representa una hoja impresa. Si
siguiera el tema de la aplicación, en tema oscuro la factura se pintaría sobre carbón y el preview
mentiría. El papel se queda fuera del tema, igual que se queda fuera del sistema de diseño.

### 6. Iconos

Tres iconos de Lucide copiados como SVG en línea en un único archivo: `arrow-up`, `arrow-down`,
`x`. 24×24, trazo 2, extremos redondeados. Cada botón de icono lleva su nombre accesible.

_Por qué copiados y no `lucide-preact`:_ son tres iconos. Una dependencia npm para tres rutas SVG
es exactamente lo que este proyecto no construye. **Es una sustitución respecto a los glifos
actuales y se anota como tal.**

### 7. Un módulo CSS, no más

La rejilla del editor —tres columnas, su colapso responsive y el scroll de cada panel— va en un
módulo CSS. Todo lo demás usa las clases globales del sistema.

_Por qué no todo en módulos CSS:_ reenvolver `.btn` en una clase propia por cada botón es
recrear el sistema de diseño con otro nombre. Las clases globales están para usarse.

### 8. El marcado de prueba no se toca

Los ganchos `data-band`, `data-block`, `data-palette-kind`, `data-geometry`, `data-action`,
`data-save-state`, `data-fragment`, `data-add-fragment` y `data-resize-handle` se conservan tal
cual. Las 60 pruebas actuales deben seguir pasando **sin editarlas**: si alguna se rompe, es que
el rediseño cambió comportamiento, que no es lo que se pidió.

## Risks / Trade-offs

- **El sistema de diseño se descarga de la red** → Solo al ejecutar `design:sync`. El resultado
  queda versionado, así que ni el arranque ni el build ni los tests dependen de que
  `design.wabot.dev` esté en pie.
- **`p`, `table`, `input` y compañía cambian de aspecto en toda la aplicación** → Es el objetivo en
  el chrome, y en el documento está cubierto por la comparación de estilos computados. Si aparece
  una diferencia, la respuesta es una regla en el archivo de overrides, no un parche en `render/`.
- **La pila del sistema no es Geist** → El aspecto varía por sistema operativo. Es la desviación
  consciente de la decisión 2.
- **El CSS inyectado crece la carga de cada página** ~26 kB sin comprimir → Aceptable para una
  superficie autenticada de uso prolongado. Si molestara, el arreglo es servir el CSS como archivo,
  que es la misma ruta de assets estáticos que hoy falta.
- **Un módulo generado más en el repositorio** → Igual que el golden fixture: se regenera con un
  script y se revisa el diff.

## Migration Plan

No hay migración de datos ni de documentos: el cambio es de presentación. El embed no se toca, así
que las facturas ya servidas se siguen viendo igual. Rollback = revertir el commit; el sistema de
diseño desaparece con él porque vive en dos archivos y un layout.

## Open Questions

- **Tema oscuro.** El sistema lo trae resuelto con `data-theme="dark"`; falta decidir si el editor
  ofrece el conmutador y dónde se recuerda la preferencia. El papel se quedaría claro en cualquier
  caso, por la decisión 5. No entra en este cambio.
- **Geist de verdad.** Empotrar las fuentes como `data:` URIs (~100 kB) o añadir una ruta de assets
  estáticos. La segunda desbloquearía además servir el CSS como archivo cacheable.
- **Dónde vive el sistema de diseño si aparece una tercera superficie.** Hoy solo lo consume
  `/templates`. Con un consumidor más, el layout y el CSS salen de `src/invoice/` a su propia
  carpeta y esto pasa a ser una capacidad `app-shell` con specs propias.
