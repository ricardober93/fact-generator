## Why

Hoy una factura no tiene estados: se guarda, se edita, se vuelve a guardar, y así para siempre.
El número lo escribe una persona en un campo de texto —el sistema no lo asigna ni rechaza
repetidos—, los totales son lo que alguien tecleó y el servidor no los comprueba, y nada
distingue un borrador de un documento entregado a un cliente. Es exactamente lo correcto para un
**documento presentacional**, que es lo que este proyecto ha sido hasta ahora.

La decisión de producto ha cambiado: esto pasa a ser la **aplicación de facturación** del
ecosistema, con DIAN más adelante y un POS offline en una fase posterior. Tres cosas dejan de
ser opcionales, y las tres son caras de añadir después porque hay que tocar documentos ya
entregados: que un documento emitido **no se pueda modificar**, que el consecutivo salga de un
**rango** en vez de un teclado, y que emitir dos veces la misma venta **no produzca dos
facturas**. Ninguna de ellas se puede retrofitar sobre facturas ya emitidas sin reescribir
historia fiscal, así que van antes de la primera emisión real, no después.

## What Changes

- **Una factura tiene estado**: `borrador` → `emitida`. Emitir es una transición explícita, no
  un guardado más.
- **Lo emitido se congela**. Los datos y las líneas de una factura emitida no vuelven a
  escribirse: ni por el formulario, ni por la acción de guardar, ni por una migración. La
  corrección de una factura emitida es una **nota de crédito**, nunca una edición ni un borrado.
- **BREAKING — el número deja de ser un campo de texto libre**. Un borrador no tiene número; al
  emitir, el sistema toma el siguiente consecutivo de un **rango de numeración** (prefijo, desde,
  hasta, vigencia) y lo escribe en los datos congelados. Se puede **sobrescribir** dando un número
  al emitir, pero ese número tiene que pertenecer a un rango vigente y estar libre: la
  sobrescritura existe para continuar el consecutivo de un sistema anterior, no para teclear
  cualquier cosa. Se elimina el requisito «el número lo escribe la persona», y el número repetido
  deja de ser un aviso para pasar a ser un rechazo.
- **Un rango se reparte por punto de emisión**. Un rango puede cederle un tramo a otro punto de
  emisión —una caja— para que numere sin preguntarle a nadie. Es lo que permitirá que el POS
  offline de la fase 3 numere sin red, y es la misma forma que tiene una resolución de
  numeración de la DIAN.
- **La aritmética se valida al emitir**. En borrador todo sigue igual: el formulario calcula, el
  campo es editable y el servidor no recalcula nada. Al emitir, el servidor comprueba que los
  importes de línea, la base, los impuestos y el total cuadran entre sí, y **rechaza la emisión**
  si no cuadran. Una factura cuyo IVA no corresponde a sus líneas es un rechazo de la DIAN
  mañana y un documento legal equivocado hoy.
- **Emitir es idempotente**. Emitir un borrador que ya está emitido devuelve el documento tal
  cual, sin consumir otro consecutivo: la identidad del borrador es la clave y no hace falta
  ninguna otra. Cubre el doble clic, el reenvío del formulario y el reintento de red.
- **Los campos fiscales dejan de vivir en el blob**. `numero`, `prefijo`, `estado`, `emitidaEn` y
  los totales pasan a ser campos declarados de la entidad, no rutas rescatadas del registro de
  datos libre con `resolvePath`. Hoy `findByNumero` trae **todas** las facturas y filtra en
  memoria porque el número no es un campo; con este cambio se puede consultar.
- **Se sigue repintando con la plantilla actual**. Esta decisión **no** se reabre: el CUFE de la
  DIAN se calcula sobre datos —número, fechas, valores, impuestos, NITs— y no sobre el diseño.
  El papel es representación; el registro son los datos. Retocar una plantilla puede y debe
  alcanzar a las facturas viejas.
- **Corolario del punto anterior**: una factura **emitida** cuya plantilla actual ya no cubre
  los caminos que congeló **no se imprime**. Hoy el desajuste es un aviso informativo; para un
  documento entregado a un cliente, imprimir incompleto es peor que no imprimir.

## Capabilities

### New Capabilities

- `invoice-issuance`: la transición de borrador a emitida, qué queda congelado y qué no vuelve a
  escribirse nunca, la validación aritmética que se exige solo al emitir, la idempotencia de la
  emisión y la negativa a imprimir un documento emitido que ya no encaja con su plantilla.
- `invoice-numbering`: el rango de numeración —prefijo, desde, hasta, vigencia—, el consumo
  atómico del siguiente consecutivo, el reparto de un tramo a un punto de emisión, y qué pasa
  cuando un rango se agota o caduca.
- `credit-notes`: la corrección de una factura emitida como documento propio, con su propia
  numeración y su motivo obligatorio, que referencia la factura corregida sin modificarla y que
  puede partir de sus líneas. Sustituye a la anulación: no hay acción de anular ni estado
  «anulada».

### Modified Capabilities

- `invoice-records`: cambia qué se guarda —estado, número, prefijo, instante de emisión y
  totales pasan a ser campos de la factura—, desaparece el requisito de que el número lo escriba
  la persona, guardar deja de estar permitido sobre una factura emitida, el formulario deja de
  ofrecer el campo de número, y el aviso de datos que ya no encajan con la plantilla pasa a ser
  bloqueante para la impresión de una factura emitida. El requisito de repintado con la
  plantilla actual **se conserva intacto**.

## Impact

**Decisión cerrada que este cambio reabre, y solo esta**: «documento PRESENTACIONAL, no fiscal».
Pasa a ser un registro fiscal. Lo que entra de dominio tributario es lo mínimo que no se puede
añadir después: estado, consecutivo con rango y vigencia, congelación e idempotencia. **No**
entra XML, ni firma digital, ni CUFE, ni QR, ni catálogos de la DIAN (ver «Fuera de alcance»).

**Código tocado**: `Invoice.ts` (estado y campos fiscales declarados), `InvoiceRepository.ts`
(`emitir`, y `saveInvoice` que rechaza escribir sobre una emitida; `findByNumero` deja de ser un
`findAll` + filtro), nuevo `models/numberRange/`, `InvoiceController.tsx` (acción de emitir),
`InvoiceEditor.island.tsx` y `invoiceForm.ts` (sin campo de número; botón de emitir; formulario
en solo lectura si está emitida), `InvoiceList.tsx` (estado y número en la lista).

**Dónde vive la aritmética**: en el controlador o el repositorio, con `Money`. No puede vivir en
`render/`, que no puede importar la raíz del framework (§1 de ARCHITECTURE.md). El cálculo de
comodidad del formulario, que ya existe en `render/money.ts` con enteros de céntimos, se queda
donde está: son dos cosas distintas —una ayuda a escribir, la otra decide si se emite—.

**Concurrencia**: consumir un consecutivo es comparar-y-escribir, igual que el bloqueo optimista
que ya existe. Se resuelve con `Locker` por clave de rango, sin dependencias nuevas.

**Datos existentes**: las facturas guardadas hasta hoy son **borradores** —no existía otra cosa—
y se leen como tales sin migración, igual que se resolvió `rev`. El número que alguien tecleó a
mano sigue en sus datos; si esa factura se emite, el rango asigna el consecutivo real y
sobrescribe esa ruta. Es el caso que hay que probar explícitamente, no dar por hecho.

**Sin dependencias npm nuevas.** `Locker`, `Money` y `CustomError` ya vienen del framework.

## Fuera de alcance

Este cambio reabre **una** decisión cerrada y ninguna más. Siguen intactas:

- **Sin XML, sin firma digital, sin CUFE, sin QR, sin catálogos de la DIAN.** La facturación
  electrónica llega después y es **aditiva**: se calcula sobre los datos congelados que este
  cambio ya garantiza. Lo que hoy se paga es no cerrarse la puerta, no abrirla.
- **Sin multi-empresa, sin `companyId`, sin entidad `Company`, sin usuarios ni roles.** Hay un
  operador y una empresa. Rellenar un `companyId` cuando todas las filas son de la misma empresa
  es una migración de una línea; lo caro de la multi-empresa es filtrar cada consulta, y eso
  llega con la segunda empresa se haya reservado la columna o no. Sigue vigente `app-auth` tal
  como está: un operador desde el entorno, sin tabla de usuarios.
- **Sin API para el POS, sin API keys, sin webhooks, sin cola.** No hay POS todavía. Cuando lo
  haya, emitirá por la misma acción con su clave de idempotencia. No se diseña un cliente para
  un llamador que no existe.
- **Sin identificador de factura generado por el cliente y sin clave de idempotencia explícita.**
  La identidad fiscal es el consecutivo, no el id de fila, y emitir siempre es «emite este
  borrador», así que el propio borrador ya es la clave. Una clave explícita solo hace falta cuando
  alguien pueda crear y emitir en una sola llamada —el POS—, y entonces es aditiva.
- **Sin catálogo de productos, sin clientes como entidad, sin stock.** Los datos de la factura
  siguen siendo el registro libre que declara el `dataSchema` de su plantilla.
- **Sin historial de versiones.** `rev` sigue siendo un contador para detectar carreras entre dos
  pestañas sobre un **borrador**. Una emitida no cambia, así que no hay nada que versionar.
- **Sin PDF de servidor.** Impresión del navegador, compromiso permanente.
- **Sin tocar el embed ni el handoff.** Una factura emitida se sirve por las mismas rutas.
- El resto sigue igual: bandas, milímetros, referencias a token, logos en base64 en `Asset`,
  bloqueo optimista por `rev` en borradores y en plantillas.
