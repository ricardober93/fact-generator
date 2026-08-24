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
  _run_.ts                      boot (excluido del scanner)

  kernel/                     ◄ lo compartido, con puerta (§5)
    paths.ts  cents.ts  versionKey.ts  README.md

  auth/                       ◄ quién entra, con qué rol, en qué empresa
    app.ts  AuthController.tsx  RequireSession.ts  RequireRole.ts
    models/User.ts + UserRepository.ts

  company/                    ◄ la empresa emisora
    app.ts  CompanyController.tsx  models/  ui/

  numbering/                  ◄ numera series; no sabe qué es una factura
    app.ts  NumberRangeController.tsx  models/  ui/

  inventory/                  ◄ artículos y existencias; no sabe qué es una factura
    app.ts  ArticleController.tsx  Stock.ts  models/  ui/

  catalog/                    ◄ el contrato de origen, con dos implementaciones
    app.ts  ICatalogSource.ts  HttpCatalogSource.ts  LocalCatalogSource.ts

  invoice/                    ◄ el documento, su diseño y su emisión
    app.ts
    InvoiceController.tsx  TemplateController.tsx  EmbedController.tsx
    Issuance.ts                 servicio: emitir y corregir
    render/                   ◄ isomorfo · sin IO · sin la raíz del framework
      render.tsx  bind.ts  theme.ts  blocks/
    models/  ui/  templates/
```

Es el layout canónico del framework: carpeta de feature, controladores en su raíz,
`models/` dentro, `ui/` para páginas y componentes.

**Un módulo es una aplicación.** Cada carpeta de `src/` declara en `app.ts` lo único que
los demás pueden importar. Su interior —`models/`, `ui/`, servicios— no se toca desde
fuera: se importa `otro/app`, nunca `otro/models/algo`.

La definición no es una metáfora. Un módulo es una aplicación **si y solo si nadie importa
su interior**, porque esa es exactamente la condición para sacarlo a su propio despliegue
cambiando el transporte y nada más. Mientras alguien alcance su interior, sacarlo es un
rediseño.

`app.ts` **no es un barril**. Un barril reexporta el interior y no encapsula nada; por eso
siguen prohibidos. `app.ts` enumera lo poco que se ofrece, y lo que no aparece es privado.
`numbering/app.ts` expone el repositorio, su controlador y los tipos de asignación; no
expone `chooseRange` ni la entidad completa.

La regla **no la impone nada**, como casi todo aquí salvo la frontera isomorfa, que sí la
impone el build. Se escribe para que se vea al revisar: un `from '../otro/` que no termine
en `/app` es la señal.

**Sin barrels.** El runner importa todos los archivos de `src/` por los side-effects de
los decoradores, así que un `index.ts` no encapsula nada que nadie pueda hacer cumplir —
solo añade un archivo por carpeta y la trampa clásica de ciclos.

**Sin archivo central de registro.** Un módulo nuevo es una carpeta hermana en `src/` y el
scanner lo encuentra solo.

Dentro de `render/` y de los árboles de island: **imports relativos**. El bundler recibe
un mapa `alias` de esbuild y no lee `tsconfig.paths`, así que `@/` solo sirve en código de
servidor.

## 3. Los dos ejes de crecimiento

El sistema crece por dos sitios y **solo** por dos. El documento crece por el registro de
bloques; el sistema crece por módulos hermanos en `src/`. Cualquier otra cosa que quiera
crecer —un plugin, un hook, un event bus— no tiene sitio por diseño.

### 3.1 El documento: el registro de bloques

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

### 3.2 El sistema: módulos hermanos

Un módulo nuevo es una carpeta nueva en `src/`, y el escáner la encuentra sola. Cada uno
declara su superficie en `app.ts` y nada más sale de él:

| módulo       | qué expone en `app.ts`                               |
| ------------ | ---------------------------------------------------- |
| `auth/`      | las guardas de sesión y de rol                       |
| `company/`   | el repositorio de empresas y su controlador          |
| `numbering/` | el repositorio de rangos, su controlador y `assign`  |
| `inventory/` | el repositorio de artículos y la operación de ajuste |
| `catalog/`   | el contrato de origen y sus dos implementaciones     |
| `invoice/`   | nada todavía: aún no sirve a nadie, y está escrito   |

Lo que **no** sale es tan importante como lo que sale. `numbering/` no expone `chooseRange`
ni la entidad completa: cuando la emisión necesitó elegir un rango, la respuesta no fue
abrir la puerta sino que el módulo expusiera la capacidad —«asígname un número»— con la
comprobación de número ocupado entrando como callback. Así la numeración sigue sin saber
qué es una factura.

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

## 5. La frontera: las mismas reglas dentro y fuera

Cuatro reglas gobiernan cómo habla este sistema con lo que no es él. Rigen igual entre dos
aplicaciones separadas por la red y entre dos módulos del mismo proceso, y por eso sacar un
módulo a su propio despliegue será un cambio de transporte y no un rediseño.

1. **Se expone lo que el consumidor necesita, no el esquema propio.** El contrato lo escribe
   quien consume. Facturación no necesita «productos»: necesita con qué rellenar una línea,
   que son cinco campos. Un `Product` de inventario tiene cuarenta y treinta y cinco no caben
   en una línea.
2. **Las referencias son opacas.** Se guardan y se devuelven; no se interpretan, no se parten,
   no se usan para construir una URL, no son claves ajenas. Mientras lo sean, el otro lado
   puede cambiar de identificadores sin avisar.
3. **Quien guarda un dato congela lo que enseña**, en vez de resolverlo al leer. Pintar una
   factura no llama a nadie: si lo hiciera, un documento emitido cambiaría cuando cambie el
   catálogo y dejaría de pintarse cuando el catálogo esté caído.
4. **Todo acoplamiento es explícito.** Hacia fuera, una variable de entorno: sin ella la
   aplicación funciona entera. Hacia dentro, `app.ts`: lo que no está declarado no existe.

La primera aplicación práctica hacia dentro es la numeración. Numera una **serie**
identificada por una clave que no interpreta, así que facturación decide que las suyas se
llaman `factura` y `notaCredito` y el día que haya remisiones la numeración no se entera. Y
cuando `InvoiceRepository` necesitó elegir un rango, la respuesta no fue exponer
`chooseRange`: fue que numbering expusiera la capacidad —«asígname un número»— con la
comprobación de número ocupado entrando como callback.

## 6. Fiscal y presentación: dónde está la línea

La **plantilla** es presentacional; el **documento emitido** es un registro fiscal, y la línea
está exactamente aquí:

| Dentro                                                   | Fuera                   |
| -------------------------------------------------------- | ----------------------- |
| Estado `borrador` → `emitida`, con transición explícita  | XML                     |
| Consecutivo desde un rango con prefijo y vigencia        | Firma digital           |
| Congelación de los datos, el emisor y el autor al emitir | CUFE                    |
| Comprobación de que la aritmética cuadra al emitir       | QR                      |
| Nota de crédito con motivo, en vez de anulación          | Catálogos SRI/DIAN/CFDI |

Entró lo que **no se puede añadir después** sin reescribir documentos ya entregados a un
cliente. Lo de la derecha es aditivo: se calcula sobre los datos congelados que garantiza lo
de la izquierda.

**Se sigue repintando con la plantilla actual**, también lo emitido: lo congelado son los
datos, no el diseño. El papel es la representación; el registro son los datos. Lo único que
el diseño no puede hacer es dejar un documento emitido sin un dato obligatorio: entonces no
se imprime, en vez de imprimirse incompleto.

**Anular no existe**: ni acción, ni estado `anulada`, ni borrado de un emitido. Lo único que
cambia el efecto de un documento entregado es una nota de crédito que lo referencia y exige
un motivo. Un estado que se cambia con un botón es una edición de un documento entregado con
otro nombre; la corrección deja los dos documentos, numerados e inmutables.

**Hay caminos que escribe el sistema** —el número y el emisor— y no se le exigen a la
persona: no son campos del formulario y la validación de datos obligatorios los salta. En el
handoff sí se exigen, porque allí los pone quien llama.

## 7. Lo que NO se construye

|                                                  | Por qué                                                                                                                                                                                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/` sin criterio de entrada                | El cajón de sastre es el resultado de no tener puerta, no de tener carpeta. Existe `kernel/` **con** puerta: sin dominio, dos consumidores ya existentes, sin estado ni IO, y su llegada tiene que borrar código. Ver `src/kernel/README.md`. |
| Capa de servicios que **reenvía** al repositorio | Un controlador puede inyectar el repositorio. Distinto es el servicio que **orquesta varios** agregados —`Issuance` recibe dos repositorios y un `Locker`—: ese sí. La diferencia se ve en el constructor.                                    |
| Test de arquitectura                             | La regla que importa ya la obliga el build (§1).                                                                                                                                                                                              |
| Interfaces con una sola implementación           | Se añade la interfaz cuando aparezca la segunda.                                                                                                                                                                                              |
| Event bus, CQRS, DTOs por capa, monorepo         | Nada de esto resuelve un problema que tengamos.                                                                                                                                                                                               |

## 8. Restricciones verificadas del framework

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

## 9. Decisiones cerradas

> Esta lista está **duplicada** en el bloque `context:` de `openspec/config.yaml`, que es lo
> que se inyecta como contexto en cada artefacto de OpenSpec. Si cambias una decisión, cambia
> las dos. Allí está el **qué** en una línea; aquí está el **porqué**.
>
> Lo que necesita más de tres líneas para explicarse **deja de ser una viñeta y se convierte
> en sección**. Sin esa puerta esta lista vuelve a ser el cajón de sastre que ya fue una vez.

- **PDF solo por impresión del navegador.** Sin Chrome headless, sin Gotenberg, sin endpoint
  de PDF, sin fuentes embebidas.
- **Los logos van en base64 en la base**, en la entidad `Asset`. Sin S3, sin disco, sin ruta
  estática, porque el adaptador PG no proyecta columnas (§8) y un asset pesado en el template
  se leería en cada listado.
- **Los datos del documento nunca viajan en el query string** del iframe: las URLs quedan en
  los logs de cualquier proxy y se filtran por `Referer`.
- **Escritura con bloqueo optimista por `rev`.** El JSONB se reescribe entero, así que sin
  `rev` la última escritura gana en silencio. El conflicto viaja como **valor**, no como
  excepción; los rechazos de la emisión, igual.
- **El embed lo consume el propio producto, y aún sin claves de aplicación.** Multi-empresa
  sí existe (§9), pero la frontera con otras apps sigue siendo por URL configurada y sin
  autenticación: cuando aparezca un origen que la exija, se le añade una cabecera. El embed
  **nunca** puede marcarse `@view({ static })`, porque una vista estática se salta los
  middlewares y serviría el documento de un cliente a cualquier visitante.
- **Acuñar un handoff exige sesión; renderizarlo solo exige el token**, que es inadivinable y
  caduca a los diez minutos. La vista se pinta dentro del iframe de otro producto, donde
  nuestra cookie puede no existir.
- **La identidad vive en la base.** `AUTH_EMAIL`/`AUTH_PASSWORD` son solo la semilla del
  primer administrador: el primer arranque sigue costando dos variables.
- **La empresa activa es un dato de la sesión firmada**, nunca una cookie aparte ni estado
  del cliente: con dos sitios donde vive la respuesta, manda la que alguien olvidó comprobar.
- **Tres roles —administrador, cajero, lectura— con guardas por ruta**, no por controlador,
  porque el de facturas mezcla ver con emitir.
- **El alcance por empresa es un parámetro obligatorio**, no una inyección: `@repository`
  aplica `singleton()`, así que un repositorio con la sesión dentro se quedaría con la
  empresa del primer visitante. Olvidar el parámetro no compila.
- **Repartir la numeración entre cajas no necesita modelo**: cada una recibe su propio rango
  disjunto con el mismo prefijo.
- **La idempotencia de emitir es la identidad del borrador**, no una clave: emitir es siempre
  «emite este borrador», y uno ya emitido se devuelve tal cual.
- **La numeración numera series con dueño y no interpreta ninguna de las dos claves**, que es
  la regla de opacidad de §5 aplicada hacia dentro.
- **Inventario es un módulo hermano, no otra aplicación.** Se decidió al revés en
  `catalog-source` —«su especificación vive en su repositorio»— y ese repositorio nunca existió,
  así que el catálogo se quedó sin proveedor. Vive aquí hablando por el contrato que ya existía,
  de modo que sacarlo a su despliegue siga siendo cambio de transporte y no rediseño (§5).
- **Un origen de catálogo puede venir de fuera o de dentro, y nunca los dos.** Con `CATALOG_URL`
  manda el externo; sin ella, el local si existe. No se mezclan porque dos orígenes pueden dar la
  misma `ref` para cosas distintas, y siendo opaca nadie podría desambiguarlas sin partirla.
- **Inventario no sabe qué es una factura.** El adaptador que lo convierte en catálogo vive en
  `catalog/`, no en `inventory/`: así el proveedor no aprende el vocabulario de quien lo consume.

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
