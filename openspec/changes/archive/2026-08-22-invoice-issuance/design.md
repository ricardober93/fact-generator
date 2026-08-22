## Context

`Invoice` guarda hoy `{ templateId, data, items, params, rev }`. Todo lo que un humano
reconocería como «la factura» —el número, la fecha, el total— vive dentro de `data`, un registro
libre cuya forma la decide el `dataSchema` de la plantilla. La entidad no lo sabe: `Invoice.numero`
es un `resolvePath(this.data.data, 'factura.numero')` y `findByNumero` trae **todas** las facturas
para filtrar en memoria.

Esa indiferencia por el contenido es justo lo que hace que el formulario se derive solo de la
plantilla, y no se toca. Lo que cambia es que ahora hay **cinco datos que el sistema sí decide**
—tipo de documento, estado, número, prefijo e instante de emisión— y que no puede seguir
adivinando de un blob que cualquiera puede editar.

Hay ya un vocabulario de rutas bien conocidas en `render/invoiceFields.ts` (`factura.numero`,
`factura.base`, `factura.impuestos`, `factura.total`, y `cantidad`/`precio`/`total` en la línea).
Este diseño se apoya en él en vez de inventar otro.

## Goals / Non-Goals

**Goals:**

- Que un documento emitido sea inmutable, y que la inmutabilidad la garantice **un solo sitio**.
- Que el consecutivo salga de un rango con vigencia, y que consumirlo sea atómico.
- Que emitir dos veces la misma venta no produzca dos documentos.
- Que la nota de crédito exista sin duplicar el modelo, el render ni el formulario.
- Que nada de esto obligue a tocar plantillas, `render/` ni datos ya guardados.

**Non-Goals:**

- Calcular impuestos. El sistema **comprueba** que la aritmética cuadra; no la decide.
- Modelar clientes, productos, empresas ni usuarios.
- Cualquier cosa de la DIAN más allá de la forma del consecutivo.

## Decisions

### 1. Un solo tipo de entidad, discriminada por `docType`

`Invoice` gana `docType: 'factura' | 'notaCredito'`. Una nota de crédito **es** una factura con
otro tipo, otro rango y una referencia al documento que corrige.

_Alternativa descartada_: entidad `CreditNote` propia. Tendría los mismos campos, el mismo
formulario derivado del `dataSchema`, el mismo render y el mismo listado; sería un duplicado
completo para distinguir dos valores de un campo. La única diferencia real —numeración
independiente— ya la resuelve `docType` en el rango.

_Consecuencia_: el listado y las consultas filtran por `docType`. Es el precio, y es una
condición en un `@query`.

### 2. El número vive en dos sitios a la vez, y es correcto

Al emitir, el número se escribe **como campo declarado de la entidad** (`numero`, `prefijo`) y
**dentro de `data`, en `factura.numero`**.

El campo declarado es lo que se consulta: unicidad, listado, búsqueda, y mañana el XML. La ruta
del blob es lo que **pinta**: `render(doc, data, params, assets)` es una función pura que solo
recibe el documento y los datos, y la plantilla ya tiene su bloque enlazado a `{{factura.numero}}`.
Escribirlo en los dos sitios evita cambiar la firma del render, el registro de bloques y todas
las plantillas existentes.

Duplicar un dato normalmente es una trampa porque los dos lados divergen. Aquí no pueden: los dos
se escriben en el mismo instante y **el documento queda congelado en ese mismo instante**. La
inmutabilidad es lo que convierte la desnormalización en segura.

### 3. Autoasignado, sobrescribible **dentro del rango**

Emitir sin número toma el siguiente consecutivo del rango. Emitir con un número lo acepta, pero
ese número DEBE pertenecer a un rango vigente y no estar usado. Si va por delante del puntero, el
puntero salta detrás de él; si va por detrás y está libre, rellena el hueco; si está ocupado o
fuera de rango, la emisión se rechaza.

_Alternativa descartada_: campo de texto libre, como hoy. Un consecutivo que cualquiera puede
teclear no garantiza nada —ni unicidad, ni pertenencia a la resolución, ni vigencia— y entonces el
rango es decoración. La sobrescritura existe para un caso real y acotado: **arrancar continuando
el consecutivo de un sistema anterior**, o registrar un documento de un talonario preimpreso.

_Alternativa descartada_: prohibir la sobrescritura. Deja sin salida la migración desde el sistema
anterior, que es el primer día de uso real.

_Consecuencia_: vuelve la comprobación de número repetido que el spec anterior había descartado
explícitamente. Ahora es barata —`numero` es un campo consultable, no una ruta de un blob— y ya no
es un aviso: es un rechazo.

### 4. El consecutivo se consume bajo `Locker`, como todo lo demás

Leer el puntero, comprobar y escribirlo es comparar-y-escribir. `Locker` con clave por rango, el
mismo patrón que ya usan `TemplateRepository` e `InvoiceRepository` y la misma razón: el adaptador
PG reescribe el JSONB entero, así que sin lock la última escritura gana en silencio. Sin
dependencias nuevas: `Locker` viene del framework y elige implementación en memoria o PG según
`DATABASE_URL`.

### 5. La idempotencia es la identidad del borrador, no una clave nueva

Emitir es siempre «emite **este** borrador». Dentro del `Locker` por id de factura que ya existe,
si el documento ya está emitido se devuelve tal cual, sin consumir otro consecutivo. Eso cubre el
doble clic, el reenvío del formulario y el reintento de red **sin añadir ningún campo**.

Una clave de idempotencia explícita solo hace falta cuando alguien pueda **crear y emitir en una
sola llamada** sin tener antes un borrador —el POS de la fase 3—. Ese llamador no existe, y
añadirle una clave entonces es aditivo: un campo opcional y una consulta. La inmutabilidad, en
cambio, no es aditiva, y por eso sí entra hoy.

_Corrige la propuesta_: donde decía «la emisión acepta una clave de idempotencia», el mecanismo es
este.

### 6. La congelación se hace cumplir en el repositorio, no en la interfaz

`saveInvoice` rechaza escribir sobre un documento emitido, y lo hace en el repositorio —el punto
por el que pasan la acción del editor, cualquier island y cualquier llamador futuro—. Que el
formulario se pinte en solo lectura es una cortesía para quien mira, no la garantía.

### 7. Qué aritmética se valida al emitir

Solo lo que el documento **lleva**, usando las rutas bien conocidas:

```
  por línea    cantidad × precio == total            (si están las tres)
  base         Σ total de líneas == factura.base     (si está)
  total        factura.base + factura.impuestos == factura.total
```

Una ruta ausente no se inventa ni se asume cero salvo `factura.impuestos`, que sí se trata como
cero cuando no está —una factura sin impuestos declarados es un caso normal, no un error—. La
comparación se hace con los **enteros de céntimos que ya usa el formulario** (`render/money.ts`), no
con `Money`. Dos razones: `Money` exige una moneda que estos datos no llevan, y verificar aritmética
de céntimos con decimales de big.js puede discrepar justo en el borde del redondeo y rechazar un
documento correcto. Comprobar con la misma aritmética que calculó es lo único que garantiza que el
formulario y la emisión no se contradigan nunca. Vive en `models/invoice/`, **nunca** en `render/`,
que no puede importar la raíz del framework (§1 de ARCHITECTURE.md).

Esto no es un motor de impuestos: no decide tarifas ni retenciones. Comprueba que lo que alguien
va a entregar a un cliente no se contradice a sí mismo.

### 8. El desajuste con la plantilla bloquea la impresión solo si está emitido

El aviso de «estos datos ya no encajan con su plantilla» sigue siendo informativo en un borrador
—se está trabajando— y pasa a impedir imprimir en un documento emitido: un papel entregado a un
cliente al que le falta un dato obligatorio es peor que un papel que no sale.

### 9. Sin migración

Como con `rev`: un documento sin `docType` se lee como `factura`, y uno sin estado, como
`borrador`. No hay script, no hay ventana de mantenimiento, no hay paso previo.

### 10. Anular no existe; la corrección se llama nota de crédito y lleva motivo

No hay acción de anular, ni estado «anulada», ni borrado de un documento emitido. Lo único que
cambia su efecto es una nota de crédito que lo referencia y que **exige un motivo**.

_Alternativa descartada_: un estado «anulada» con motivo, que es lo que pedía el brief original. Es
una edición de un documento ya entregado a un cliente con otro nombre: deja un documento y ninguna
huella de lo que se corrigió. La corrección deja dos documentos, los dos numerados y los dos
inmutables, que es lo que se puede auditar. Y no es una preferencia de diseño: con facturación
electrónica la anulación **es** una nota de crédito, así que el camino corto ahora sería el camino
que hay que deshacer después.

El motivo obligatorio es la parte del brief que sí valía la pena y se conserva. Sin catálogo de
conceptos: los códigos son datos tributarios y este cambio los deja fuera.

Corolario: una nota de crédito solo puede referenciar una factura **emitida**. Un borrador no se
corrige, se edita.

### 11. El punto de emisión no se modela

Repartir la numeración entre cajas es darle a cada una su **rango disjunto con el mismo prefijo**,
que la regla de no solapamiento ya permite. Ni entidad `CashRegister`, ni campo que nadie consulta,
ni mecanismo de «ceder un tramo». El POS offline de la fase 3 numera sin red con lo que ya hay.

## Risks / Trade-offs

- **El número tecleado a mano de un borrador antiguo se pierde al emitir** → El rango manda y
  sobrescribe `factura.numero`. Quien quiera conservarlo tiene la sobrescritura acotada de la
  decisión 3: lo escribe como número de emisión y, si es válido, ese mismo queda. Caso a probar
  explícitamente, no a suponer.
- **Repintar con la plantilla actual puede cambiar lo que muestra un documento emitido** → Es la
  decisión de producto y no se reabre; el riesgo real —que deje de mostrar un dato obligatorio— lo
  ataja la decisión 8 impidiendo imprimir en vez de imprimir incompleto.
- **Rellenar huecos hacia atrás produce documentos con número menor y fecha mayor** → Se permite
  porque es el caso de la migración; la unicidad y la vigencia siguen garantizadas, que es lo que
  hace verificable el consecutivo.
- **Dos rangos vigentes solapados numerarían dos veces lo mismo** → Al crear un rango se rechaza
  el solapamiento con otro del mismo `docType` y prefijo. Es la única invariante del rango que no
  puede comprobarse en el momento de emitir.
- **`writePath` existe dos veces**: en `ui/invoiceEdits.ts` para el formulario y como `withPath` en
  `Invoice.ts` para congelar el número. Se deja así **a propósito**: son ocho líneas puras, los dos
  lados usan familias de tipos distintas y unificarlas obliga a `as unknown as` en la firma. Un
  duplicado honesto y visible es mejor que una abstracción que necesita castings para existir.
- **`Locker` en memoria si no hay `DATABASE_URL`** → En desarrollo, dos procesos podrían consumir
  el mismo consecutivo. Es la misma condición que ya rige para `rev`, y en producción hay `DATABASE_URL`.

## Migration Plan

No hay migración de datos (decisión 9). El despliegue es el binario nuevo. Antes de emitir el
primer documento hay que **crear un rango**; sin rango vigente, emitir falla con un mensaje que lo
dice. Los borradores existentes siguen abriéndose, editándose y guardándose igual que ayer.

Marcha atrás: mientras no se haya emitido nada, volver a la versión anterior es inocuo —los campos
nuevos se ignoran—. Con documentos ya emitidos, la vuelta atrás los deja editables otra vez; a
partir de la primera emisión real, la marcha atrás es una decisión, no un botón.

## Open Questions

Ninguna. Las dos que quedaban se cierran arriba: la nota de crédito exige que la factura
referenciada esté emitida (decisión 10) y el punto de emisión no se modela (decisión 11).
