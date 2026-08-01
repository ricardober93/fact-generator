# Arquitectura

Generador de facturas con dos superficies —un embed en iframe y un editor drag-and-drop—
montadas sobre un mismo motor de render.

## 1. La única frontera

Casi todo el código de este proyecto es código de servidor normal de wabot. Hay **una sola
frontera arquitectónica**, y no es una convención: la impone la herramienta.

```
                    ┌──────────────────────────────┐
   Node (SSR)  ────▶│                              │
                    │      invoice/render/         │
                    │   render(doc,data,params,    │──▶  JSX
                    │           assets)            │
   Navegador   ────▶│                              │
   (island)         └──────────────────────────────┘
                      mismo código en los dos lados
```

El preview del editor y el render del embed son **la misma función**. No pueden divergir
porque no hay dos implementaciones que mantener sincronizadas.

Para que ese código corra en el navegador, `render/` importa únicamente
`@wabot-dev/framework/ui` — nunca `@wabot-dev/framework` a secas. Es la única entrada del
paquete con condición `browser`; la raíz arrastra express, pg, socket.io y los SDKs de IA.

**Esta regla no necesita vigilancia.** Al violarla, esbuild intenta meter express en el
bundle del island y el build falla. La herramienta ya es el test.

## 2. Estructura

```
src/
  _run_.ts                          boot (excluido del scanner)
  invoice/
    TemplateController.tsx          @uiController({ path: '/templates', app: true })
    EmbedController.tsx             @uiController('/embed')
    render/                       ◄ isomorfo · sin IO · sin la raíz del framework
      render.tsx                    render(doc, data, params, assets) → JSX
      bind.ts                       {{ruta.al.dato|filtro}} → valor
      theme.ts                      tokens → CSS custom properties
      blocks/
        registry.ts
        text.tsx  image.tsx  box.tsx  line.tsx
    models/
      template/Template.ts + TemplateRepository.ts
      asset/Asset.ts + AssetRepository.ts
    ui/
      pages/                        páginas SSR del editor
      *.island.tsx                  lo interactivo (lienzo, inspector, paleta)
```

Es el layout canónico del framework: carpeta de feature, controladores en su raíz,
`models/` dentro, `ui/` para páginas y componentes.

**Sin barrels.** El runner importa todos los archivos de `src/` por los side-effects de
los decoradores, así que un `index.ts` no encapsula nada que nadie pueda hacer cumplir —
solo añade un archivo por carpeta y la trampa clásica de ciclos.

**Sin archivo central de registro.** Una feature nueva es una carpeta hermana de
`invoice/` y el scanner la encuentra sola.

Dentro de `render/` y de los árboles de island: **imports relativos**. El bundler recibe
un mapa `alias` de esbuild y no lee `tsconfig.paths`, así que `@/` solo sirve en código de
servidor.

## 3. El eje de crecimiento: el registro de bloques

Un tipo de bloque es **un archivo**. Aporta schema, defaults, render e inspector, y con eso
aparece en la paleta, se valida, se pinta y tiene panel de propiedades.

```tsx
// invoice/render/blocks/qr.tsx
export default defineBlock({
  kind: 'qr',
  schema: { value: 'string', ecc: 'enum:L,M,Q,H' },
  defaults: { w: 25, h: 25, ecc: 'M' }, // milímetros
  render: (block, ctx) => <img src={ctx.qr(block.value)} />,
  Inspector: (props) => <QrPanel {...props} />,
})
```

Es el único punto de extensión del proyecto. No hay sistema de plugins, ni hooks, ni
eventos: si el producto crece, crece por aquí.

## 4. El modelo del documento

Bandas de motor de reportes, con posicionamiento absoluto **dentro** de cada banda:

```
  ┌─ header ────────────┐  una vez
  ├─ detailHeader ──────┤  <thead> → el navegador lo repite en cada página impresa
  ├─ detail ────────────┤  una vez POR ÍTEM
  ├─ summary ───────────┤  una vez
  └─ pageFooter ────────┘  position: fixed → en cada página impresa
```

Las coordenadas `x`/`y` de un bloque son relativas **a su banda**, no a la página: por eso
la banda `detail` puede repetirse N veces. Todo en milímetros, que CSS entiende de forma
nativa — el mismo número sirve en el editor, en pantalla y en papel, sin factor de escala.

La paginación multipágina y el pie repetido salen del navegador (`<thead>`,
`position: fixed`, `@page`). No hay motor de paginación propio.

Un bloque **nunca** guarda un color literal: guarda una referencia a token (`@primary`,
`@logo`). Por eso un parámetro del iframe repinta el documento entero sin tocar un solo
bloque, y por eso el template declara su propio schema de `params` — el contrato del embed
vive en el documento, no en el código del controlador.

## 5. Lo que NO se construye

|                                              | Por qué                                                            |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `shared/`                                    | Termina siendo el cajón de sastre. Lo compartido vive donde nació. |
| Capa de servicios que reenvía al repositorio | Un controlador puede inyectar el repositorio.                      |
| Test de arquitectura                         | La regla que importa ya la obliga el build (§1).                   |
| Interfaces con una sola implementación       | Se añade la interfaz cuando aparezca la segunda.                   |
| Event bus, CQRS, DTOs por capa, monorepo     | Nada de esto resuelve un problema que tengamos.                    |

## 6. Restricciones verificadas del framework

| Restricción                                                                                                                                         | Origen                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `@action` parsea con `json()` sin opciones → límite de **100 kb** de body                                                                           | `runUiControllers.js:373` |
| Los islands se bundlean con `bundle:true` y sin `external`: sí se pueden usar deps npm dentro de un island (agnósticas de framework, no React-only) | `UiBundler.js:64`         |
| El bundler recibe `alias` de esbuild y **no** lee `tsconfig.paths`                                                                                  | `UiBundler.js:71`         |
| `@view({ static })` se salta los middlewares — nunca en ruta autenticada                                                                            | `wabot-ui`                |
| El adaptador PG no proyecta columnas: `findAll()` trae el blob `data` entero                                                                        | `PgJsonRepositoryAdapter` |
| El scanner ignora directorios que empiezan por `__`                                                                                                 | `scanner.js`              |

Consecuencia del límite de 100 kb: un logo se normaliza **en el cliente** con
`createImageBitmap` → `<canvas>` a 600 px → `toDataURL()`, y se sube como JSON plano. Sin
multipart en ninguna parte. A 30 mm impresos y 300 dpi hacen falta ~354 px, así que 600 es
holgado y el límite nunca estorba.

Consecuencia de la falta de proyección de columnas: los logos van en su **propia entidad**
`Asset`, nunca incrustados en el JSON del template, que se lee en cada listado.

## 7. Decisiones cerradas

- Documento **presentacional**, no fiscal. Sin XML, firma digital, CUFE ni catálogos
  SRI/DIAN/CFDI.
- PDF **solo por impresión del navegador**. No habrá Chrome headless, ni Gotenberg, ni
  endpoint de PDF.
- Embebido **solo por el producto propio**, mismo origen, cookies de sesión. Sin
  multi-tenant, sin API keys, sin tokens firmados. El embed **no** puede ser `static`.
- Logos en **base64 en la base de datos**, en la entidad `Asset`. Sin S3, sin disco, sin
  ruta estática.
- Los datos del documento **nunca** viajan en el query string del iframe.
- Escritura con **bloqueo optimista** por campo `rev`: el JSONB se reescribe entero, así
  que sin `rev` la última escritura gana en silencio.

### Seguridad

- Los logos se renderizan **siempre** como `<img src="data:...">`, nunca inlineando el
  markup SVG en el DOM. En contexto `<img>` el navegador no ejecuta los scripts que pueda
  llevar un SVG; inlineado como markup, sí los ejecuta.
- Allowlist de MIME por **magic bytes** (png, jpeg, webp, svg+xml), no por lo que declara
  el cliente. La validación de tamaño va en el servidor aunque el cliente ya normalice.
- El texto de un bloque se guarda como **estructura**, nunca como HTML crudo.
- El embed valida sus parámetros contra el schema `params` que declara el propio template.
  Un parámetro no declarado se ignora.

### Abierta

Paginación en pantalla. Por defecto, papel continuo: el corte real solo se ve en Ctrl+P.
`paged.js` (+200 kb, motor de layout paralelo) solo si se justifica.
