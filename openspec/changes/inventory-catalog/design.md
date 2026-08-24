## Context

El contrato `catalog-source` existe, está probado contra un proveedor de mentira y no tiene proveedor
real. `CatalogSource` es hoy una clase única con `fetch` dentro y `CATALOG_URL` leída en el
constructor: no hay interfaz porque nunca hubo una segunda implementación. Este cambio trae la
segunda, que es la condición que §7 pone para añadir la interfaz.

El módulo nuevo no estrena patrón: `inventory` se construye con la forma que ya tienen `numbering` y
`company` —entidad, repositorio, controlador de UI, `app.ts` como puerta—, y el alcance por empresa
con la misma regla del parámetro obligatorio. Lo que sí es nuevo es que un módulo de este repo pase a
alimentar a otro por un contrato escrito para hablar por red.

## Goals / Non-Goals

**Goals:**

- Que el selector de líneas funcione sin `CATALOG_URL`, contra artículos de este mismo proceso.
- Que el contrato siga siendo el mismo, para que sacar Inventario a su despliegue sea cambiar de
  implementación y no reescribir a quien lo consume.
- Que un ajuste de existencias se pueda explicar meses después.

**Non-Goals:**

- Descontar al emitir (cambio 2) y el punto de venta (cambio 3).
- Que Inventario sepa qué es una factura. No lo sabrá al terminar este cambio.
- Rendimiento: el volumen del brief es un mostrador, no un almacén.

## Decisions

### La interfaz vive en `catalog`, y la implementación local también

`ICatalogSource` lo declara `catalog/`, que es quien consume, según la regla 1 de §5. La
implementación local **también** vive en `catalog/`, inyectando el repositorio de artículos desde
`inventory/app.ts`.

La alternativa era que `inventory` implementara la interfaz, que es la inversión de dependencias de
libro. Se descarta porque obliga a Inventario a importar el vocabulario de quien lo consume: sabría
que existe algo llamado catálogo de facturación y que sus artículos son «ítems» con `unitPrice` y
`taxRate`. Con el adaptador en `catalog/`, Inventario es un catálogo de artículos y nada más, y el
día que aparezca un segundo consumidor no hay que tocarlo.

Dirección resultante: `invoice → catalog → inventory`. Sin ciclo, y `inventory` no importa a nadie.

### El origen se elige por configuración, y nunca hay dos

Con `CATALOG_URL` puesta manda la implementación HTTP; sin ella, la local. Nunca las dos a la vez y
sin mezclar resultados.

Mezclar era tentador —un ERP más lo de casa— y se descarta: dos orígenes pueden devolver la misma
`ref` para cosas distintas, y como la referencia es opaca nadie puede desambiguarlas sin partirla,
que es justo lo que la regla 2 de §5 prohíbe. Una configuración explícita gana a un defecto
implícito, así que quien pone la variable sabe lo que quiere.

### La empresa entra como parámetro en la interfaz

Las dos preguntas pasan a llevar el dueño delante: `search(owner, text)` y `findByRef(owner, ref)`,
igual que `findBySeries(owner, series)` en numeración.

Sin eso la implementación local no puede filtrar, y la decisión cerrada de que el alcance por empresa
sea parámetro y no inyección no admite la salida fácil de meter la sesión dentro del repositorio: es
`singleton()` y se quedaría con la empresa del primer visitante. La implementación HTTP recibe el
dueño y lo ignora —un origen externo tiene su propio alcance—, que es preferible a dos firmas
distintas para el mismo contrato.

### Las existencias son un número en el artículo y un libro al lado

La cantidad vive en el artículo; cada cambio escribe además un movimiento con su motivo, su instante
y quién lo hizo. Leer existencias es leer el artículo.

La alternativa —sólo el libro, y la cantidad como suma— se descarta por §8: el adaptador PG no
proyecta columnas, así que sumar movimientos por artículo en un listado leería el blob entero de cada
movimiento de la historia. La contrapartida es que el número y el libro pueden separarse, y por eso
sólo hay **un** camino que escriba los dos, bajo el `rev` del artículo.

### El motivo del ajuste es obligatorio

Un ajuste sin motivo es un descuadre anónimo. Es la misma regla que ya obliga a la nota de crédito a
llevar motivo en vez de dejar anular, aplicada a la otra cosa que cuadra o no cuadra.

## Risks / Trade-offs

- **El número y el libro se separan** → un solo camino de escritura, bajo el `rev` del artículo, y
  ningún otro módulo puede tocar la cantidad: `app.ts` no la expone, expone la operación.
- **`catalog` pasa a depender de `inventory`** → si el módulo no está declarado, la implementación
  local dice que no hay origen y la aplicación sigue entera, que es lo que ya prometía el contrato
  cuando faltaba la variable.
- **Cambiar la firma de las dos preguntas toca a quien las llama** → es un solo llamador, el editor
  de facturas, y el compilador lo señala; no hay despliegue anterior con la firma vieja.
- **Con `CATALOG_URL` puesta, el catálogo local queda invisible** → es la consecuencia querida de que
  nunca haya dos orígenes; se documenta en `.env.example` junto a la variable.

## Migration Plan

No hay datos que migrar: la aplicación no se ha desplegado nunca y no existe ningún artículo. El
comportamiento actual con `CATALOG_URL` puesta se conserva entero, así que una instalación que ya
apunte a un origen externo no nota este cambio.

## Open Questions

- Si un artículo se borra, ¿qué le pasa a las líneas ya guardadas que lo referencian? El contrato ya
  responde para el caso externo —una referencia huérfana se ve y se imprime— y aquí no cambia, pero
  con el proveedor en casa aparece la tentación de impedir el borrado. Se deja fuera hasta que
  alguien lo pida: hoy el artículo se puede borrar y la línea sobrevive con su texto congelado.
