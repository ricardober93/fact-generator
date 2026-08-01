## Context

Ver `ARCHITECTURE.md` para la estructura del proyecto y la frontera de `invoice/render/`, y
`openspec/specs/invoice-document-model/` para el modelo que este cambio consume. Aquí solo
lo que este cambio decide de nuevo.

Estado de partida: el documento existe, se valida y se guarda. `IBlockDefinition` ya declara
un campo `render` opcional que ninguna definición rellena; los cuatro bloques son archivos
`.ts` sin marcado. `emptyDocument()` y el fixture de factura ya sirven de entrada al motor.

## Goals / Non-Goals

**Goals:**

- Una función que produzca el marcado del documento y que corra igual en Node y en el
  navegador, para que el preview del editor no pueda divergir del embed.
- Que la paginación, la cabecera repetida y el pie por página los haga el navegador.
- Que un parámetro del iframe repinte el documento sin recorrer bloques.
- Que un dato obligatorio ausente se note al renderizar, no en el PDF que ya vio el cliente.

**Non-Goals:**

- Rutas HTTP, controladores y hidratación: eso es `embed-iframe` y `template-builder`.
- El `Inspector` de cada bloque: sigue vacío hasta el editor.
- Paginación en pantalla.

## Decisions

### La tabla no es decorativa: es el motor de paginación

`detailHeader` va en `<thead>` y las repeticiones de `detail` en `<tbody>`. El navegador
repite el contenido de un `<thead>` en cada página impresa por sí solo, y `position: fixed`
reproduce el pie en cada hoja. Con `@page { size; margin }` derivado de la página del
documento, la impresión queda resuelta sin una línea de cálculo propio.

Alternativas descartadas:

| Opción                       | Por qué no                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| paged.js                     | ~200 kb y un segundo motor de layout corriendo junto al del navegador. Solo aporta ver las hojas en pantalla. |
| Calcular los saltos nosotros | Es escribir un motor de paginación propio, justo lo que el modelo de bandas existe para evitar.               |

Lo que se acepta: en pantalla el documento es papel continuo y el corte real solo se ve en
Ctrl+P. Ver riesgos.

### Los bloques absolutos viven dentro de las celdas

Cada banda es un contenedor con `position: relative` y el alto declarado; los bloques van
dentro con `position: absolute` y sus coordenadas en `mm`. La banda `detail` es ese mismo
contenedor metido en un `<td>`. Así las coordenadas siguen siendo relativas a la banda —que
es lo que permite repetirla— y a la vez la tabla puede paginar.

### El tema viaja como custom properties, no como valores en los bloques

El tema resuelto se emite una vez en el contenedor raíz (`--primary: #0a58ca`) y cada bloque
referencia `var(--primary)`. Un parámetro del embed cambia una declaración en la raíz y el
documento entero se repinta: cero recorrido de bloques, y el marcado de los bloques es
idéntico entre dos renders que solo difieren en parámetros.

### El contrato de datos vive en el documento

Se añade `dataSchema` a `IDocument`: las rutas que el documento consume, cada una con su
tipo y si es obligatoria. La validación del documento comprueba además que toda ruta usada
en un binding esté declarada, para que el contrato no se quede atrás cuando alguien añade un
campo en el editor.

Alternativa descartada: inferir el contrato recorriendo los bindings en tiempo de render. Es
tentador porque no añade campo, pero entonces "obligatorio" no se puede expresar —todo
binding sería obligatorio, o ninguno— que es justo la distinción que se pidió.

### El formato sale de `Intl`, y el locale del documento

`Intl.NumberFormat` e `Intl.DateTimeFormat` son nativos, isomorfos y ya están en los dos
runtimes. `Money` del framework no es opción: vive en la raíz del paquete, que `render/` no
puede importar sin romper el bundle del island.

El locale y la moneda se declaran en el documento y se sobreescriben por parámetros del
embed, reusando el mecanismo de `params` que ya existe. **No** se lee el locale del
navegador: Node y el navegador darían cadenas distintas para el mismo dato, la hidratación
no coincidiría y el preview dejaría de ser fiel al render — que es la única propiedad que
esta arquitectura existe para garantizar.

### El texto se construye como nodos, nunca como cadena de HTML

Los fragmentos se emiten como hijos JSX. No hay `dangerouslySetInnerHTML` en ninguna parte
del motor. Un fragmento con `<script>` sale como caracteres visibles porque el escapado lo
hace el renderer, no nosotros.

## Risks / Trade-offs

**En pantalla no se ven los saltos de página** → El usuario diseña sobre papel continuo y
descubre el corte al imprimir. Se mitiga barato: una guía visual cada `altura útil` de
página en el editor marca dónde caerá el corte, sin paginar de verdad. Si resulta
insuficiente, paged.js sigue siendo una decisión reversible y aislada en un solo módulo.

**`position: fixed` para el pie se comporta distinto entre navegadores** → Chrome lo repite
en cada página impresa; el soporte fuera de Chromium es más irregular. Dado que el PDF sale
de Ctrl+P y el producto es propio, el objetivo declarado es Chromium. Conviene comprobarlo
en Firefox antes de prometer nada.

**Un dato obligatorio ausente rompe el render entero** → Es lo pedido, pero significa que el
embed puede quedarse en blanco por un campo. El error nombra todas las rutas ausentes, de
modo que `embed-iframe` pueda mostrar un mensaje accionable en vez de una página rota. Cómo
se presenta es decisión de ese cambio.

**Añadir `dataSchema` cambia la forma del documento después de haberla cerrado** → Es
exactamente el coste que anticipó `invoice-template-model`. No hay datos en producción, así
que el coste real es actualizar `emptyDocument()`, el fixture y la validación.

**El escapado depende del renderer de Preact** → Es una garantía del renderer, no nuestra.
Un test debe fijarla explícitamente para que un cambio futuro de renderer no la pierda en
silencio.

## Migration Plan

Sin migración de datos: no hay documentos en producción. `emptyDocument()` empieza a
producir `dataSchema`, `locale` y `currency`; el fixture de factura se actualiza; la
validación exige los tres campos.

Los cuatro archivos de bloque pasan de `.ts` a `.tsx` al estrenar su `render`. El
`jsxImportSource` ya apunta a `@wabot-dev/framework/ui` en `tsconfig.json`, así que no hay
configuración que tocar.

Rollback: revertir el commit.

## Open Questions

- **Guía de corte de página en el editor.** Propuesta: una línea tenue cada altura útil de
  página en el preview. Es del editor, así que se decide en `template-builder`; se menciona
  aquí porque es la mitigación del riesgo principal de esta decisión.
- **Comportamiento del pie fuera de Chromium.** Comprobar en Firefox durante la
  implementación y anotar el resultado; no bloquea.
