## Context

ARCHITECTURE.md declara un eje de crecimiento —«una feature nueva es una carpeta hermana de
`invoice/`»— que nunca se ha usado: 150 de los 170 archivos del proyecto están dentro de `invoice/`.
No es que el eje estuviera mal; es que hasta ahora solo había una feature.

Con `company-scoping` y `catalog-source` en cola, dejan de ser una. Este cambio usa el eje por primera
vez y arregla de paso dos cosas que ya están rotas: un archivo por encima del límite y un repositorio
que dejó de serlo.

## Goals / Non-Goals

**Goals:**

- Que `invoice/` deje de ser el sitio donde cae todo por descarte.
- Que la numeración no sepa qué es una factura.
- Que la emisión tenga un nombre que diga lo que hace.
- Que `company/` y `catalog/` nazcan con una forma ya decidida.

**Non-Goals:**

- Tocar `render/`, el registro de bloques o el modelo del documento.
- Cambiar comportamiento, rutas o datos guardados.
- Convertir esto en paquetes, monorepo o despliegues separados.

## Decisions

### 1. Un módulo es una carpeta en `src/`, y siempre tiene la misma forma

```
  src/<módulo>/
    <X>Controller.tsx      superficie HTTP, si la tiene
    models/                entidades y repositorios
    ui/                    páginas, componentes e islands
    <servicio>.ts          orquestación, si hace falta
```

Es exactamente el layout canónico que ya usa `invoice/` y que `auth/` sigue en pequeño. Escribirlo
como patrón no añade nada nuevo: evita que el tercero y el cuarto módulo lo inventen otra vez.

Un módulo **puede** importar de otro. Lo que no puede es importar de su interior: se importa lo que el
módulo expone en su raíz, no `otro/models/algo/Detalle`. Sin barrels y sin fichero de registro —el
escáner ya recorre `src/` entero—, así que esto es una convención de lectura, no algo que la
herramienta imponga. Se dice para que se note al revisar, no para vigilarlo.

### 2. La numeración numera **series**, no tipos de documento

`NumberRange.docType: 'factura' | 'notaCredito'` pasa a `series: string`. La numeración no interpreta
ese valor: parte los rangos por él, comprueba que no se solapen dentro de la misma serie y entrega
consecutivos.

Es la misma regla de opacidad que `catalog-source` escribió para la frontera entre apps, aplicada
hacia dentro: **quien no necesita entender un valor no debe entenderlo**. Facturación decide que sus
series se llaman `factura` y `notaCredito`; el día que haya remisiones o recibos, la numeración no se
entera.

_Alternativa descartada_: dejar `docType` y mover la carpeta igual. El módulo quedaría movido pero
seguiría atado al vocabulario de facturas, que es justo lo que hace que un módulo no se pueda reutilizar.

_Consecuencia_: los mensajes de rechazo dejan de poder decir «no hay rango de **facturas**». Los
compone quien llama, que es el que sabe qué es una factura.

### 3. La emisión es un servicio, y eso **matiza** una decisión cerrada

`Issuance` recibe `InvoiceRepository`, `NumberRangeRepository` y `Locker`, y contiene `issue`,
`createCreditNoteFor` y la comprobación de aritmética. `InvoiceRepository` se queda con crear,
guardar, borrar y consultar.

ARCHITECTURE.md §5 prohíbe «capa de servicios que reenvía al repositorio», y la razón que da es que un
controlador puede inyectar el repositorio directamente. Esa razón sigue siendo verdad y la prohibición
se queda: un servicio que solo reenvía sigue sin poder existir.

Lo que aquella regla no contemplaba es un caso que ahora existe: **coordinar tres colaboradores y un
bloqueo**. Eso no es reenviar. Meterlo en el repositorio fue lo cómodo mientras cabía, y el resultado
es un `@repository` que inyecta otros dos repositorios —que es exactamente la señal de que el nombre
dejó de describir la cosa—.

Redacción nueva de la regla: **prohibido el servicio que reenvía; permitido el que orquesta varios
agregados.** La diferencia se comprueba mirando el constructor: si inyecta un repositorio, sobra; si
inyecta tres y un `Locker`, es lo correcto.

### 4. El controlador solo tiene rutas

Salen a archivos hermanos los DTO (`InvoiceDtos.ts`), la clave de versión (`invoiceVersion.ts`) y los
ayudantes de error. No es un criterio estético: un controlador se lee para saber **qué rutas hay**, y
sesenta líneas de validación antes de la primera ruta lo impiden.

### 5. Nada se mueve sin que las pruebas lo digan

Ninguna prueba cambia de aserción en este cambio: solo de `import`. Una prueba que haya que reescribir
para que el movimiento pase es una prueba que estaba atada a la estructura y no al comportamiento, y
eso se anota en vez de arreglarse por el camino.

## Risks / Trade-offs

- **Un movimiento grande de archivos ensucia el historial** → Se hace en un commit por movimiento, sin
  mezclar cambios de contenido, para que `git log --follow` siga funcionando.
- **`series: string` admite cualquier cosa, incluida una errata** → Facturación sigue teniendo su tipo
  cerrado y es la única que compone series; la numeración no valida un vocabulario que no conoce. El
  error posible se queda del lado que sabe reconocerlo.
- **Reordenar sin añadir nada visible es trabajo que no se ve** → Cierto, y por eso se hace ahora y no
  «cuando haya tiempo»: las dos propuestas en cola aterrizan en estos archivos, así que hacerlo
  después significa hacerlo dos veces.
- **Renombrar un escenario en un delta lo borra del spec** → No es una teoría: el archivado de este
  cambio se ensayó en seco y lo rechazó, igual que había rechazado el de `invoice-issuance` por lo
  mismo. El archivador resuelve los bloques `MODIFIED` por su cabecera y compara **nombres** de
  escenario: un nombre distinto es un escenario que desaparece. Los títulos de requisito sí se pueden
  cambiar, con un bloque `RENAMED`; los nombres de escenario no se tocan nunca, y si el texto ha
  envejecido se cambia el cuerpo y se deja el nombre.
- **La regla de no importar el interior de otro módulo no la impone nada** → Se acepta. La única regla
  de dependencia que este proyecto vigila de verdad la impone el build (§1), y añadir un test de
  arquitectura está explícitamente descartado.

## Migration Plan

Sin migración de datos. Un rango guardado con `docType` se lee como `series` con el mismo valor, con
el mismo truco que ya se usó con `rev`, `estado` y `docType`: valor por defecto en el getter, sin
script y sin paso previo.

Se hace **antes** que `company-scoping` y `catalog-source`.

## Open Questions

Ninguna.
