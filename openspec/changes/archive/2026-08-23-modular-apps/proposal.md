## Why

Conviene decir primero lo que **no** se replantea, porque es medible: esta sesión añadió emisión,
numeración, notas de crédito, congelación y dos pantallas, y `render/` cambió **una palabra**. El
registro de bloques, `document.ts` y `render.tsx` quedaron idénticos byte a byte. La frontera isomorfa
aguanta y no se toca.

Lo que sí se ha quedado corto es el modelo de crecimiento. Tres señales con número:

- **`InvoiceController.tsx` tiene 269 líneas** contra un límite de 250. Regla rota hoy.
- **`InvoiceRepository` inyecta tres colaboradores** y orquesta bloqueos, aritmética y consecutivos:
  es un servicio con nombre de repositorio, y con las propuestas en cola pasa de 250 líneas.
- **`src/invoice/` son 150 de los 170 archivos.** El eje declarado —«una feature nueva es una carpeta
  hermana»— no se usó nunca, porque hasta ahora solo había una feature.

Y hay una cuarta, que es la que obliga a replantear en vez de reordenar: `catalog-source` escribió las
reglas de la frontera **entre aplicaciones** —capacidades y no esquemas, referencias opacas, congelar
en vez de resolver, integración por configuración—. Dentro del proceso no rige ninguna. Un módulo
puede alcanzar el interior de otro sin que nada lo note, así que la promesa de «apps independientes»
solo es verdad en el borde que ya cruzó la red.

## What Changes

- **Un módulo es una aplicación.** Cada uno declara en `app.ts` lo único que los demás pueden importar:
  su superficie. Su interior —entidades, repositorios, servicios, `ui/`— no se toca desde fuera. La
  prueba de que un módulo es una aplicación es que **nadie importa su interior**, y esa es la
  condición para poder sacarlo a su propio despliegue el día que haga falta sin rediseñarlo.
- **Las mismas cuatro reglas rigen dentro y fuera.** Lo que `catalog-source` fijó para hablar con otra
  app por red pasa a regir entre módulos del mismo proceso. Sacar un módulo a la red deja de ser un
  rediseño y pasa a ser un despliegue.
- **BREAKING respecto a una decisión cerrada — nace `src/kernel/`**, y con una regla de admisión, que
  es lo que le faltaba a la idea que se descartó. Entra algo solo si **no tiene significado de
  dominio**, **ya tiene dos consumidores reales** y **no tiene estado, IO ni decoradores**. Con techo:
  pasado un puñado de archivos, no se añade, se investiga qué módulo está goteando.
- **Arranca con lo que hoy ya está duplicado o compartido**, no con lo que podría estarlo: la clave de
  versión (3 archivos), el acceso por caminos (3), la aritmética de céntimos (2) y el resultado
  tipado `{ status }` que ya se repite en tres repositorios.
- **La numeración sale a su propio módulo y deja de saber qué es una factura**: numera una **serie**
  identificada por una clave que no interpreta. Es la regla de opacidad aplicada hacia dentro.
- **La emisión pasa a ser servicio de dominio**, y se matiza §5: sigue prohibido el servicio que
  **reenvía** al repositorio; deja de estarlo el que **orquesta varios** agregados.
- **El controlador se queda solo con rutas**, y baja de 250.

## Capabilities

### Modified Capabilities

- `invoice-numbering`: un rango numera una serie identificada por una clave opaca, no un tipo de
  documento cerrado. El comportamiento no cambia —facturas y notas de crédito siguen numerándose por
  separado—; lo que cambia es que la numeración deja de conocer el vocabulario de facturación.

## Impact

**Sustituye a `module-boundaries`**, que resolvía las tres primeras señales sin tocar la cuarta.
Aquellos tres movimientos siguen aquí; lo que se añade es el modelo que los explica.

**Sin cambios de comportamiento** salvo el renombrado de un campo. Ninguna ruta, pantalla o forma de
dato cambia para quien la usa.

**Datos existentes**: un rango guardado con `docType` se lee como `series` con el mismo valor, sin
migración, igual que se resolvieron `rev`, `estado` y `docType`.

**Va antes que `company-scoping` y `catalog-source`**: las dos aterrizan en estos archivos y nacen ya
como módulos.

## Fuera de alcance

- **No se toca `render/`**: ni la frontera isomorfa, ni el registro de bloques, ni el modelo del
  documento. Es la parte que ha demostrado aguantar.
- **Sin monorepo, sin paquetes, sin `package.json` por módulo.** Un módulo es una carpeta; que se
  pueda extraer no significa extraerlo.
- **Sin despliegues separados.** Nada se saca del proceso en este cambio.
- **Sin barrels.** `app.ts` no es un barril que reexporta el interior: declara una superficie, que es
  lo contrario.
- **Sin event bus, sin CQRS, sin inyección de contratos con una sola implementación.**
- **Sin tocar la interfaz** del editor, el embed ni el listado.
- **Sin dependencias npm nuevas.**
