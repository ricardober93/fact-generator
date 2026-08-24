## Context

El editor y el embed son dos superficies sobre el mismo motor. El POS es la tercera, y es la primera
que no compone un documento sino que lo despacha.

`invoice/app.ts` exporta hoy `{}` —«nada todavía: aún no sirve a nadie, y está escrito»—. Este cambio
es quien lo estrena, así que la forma de esa puerta se decide aquí y no será fácil de estrechar
después.

## Goals / Non-Goals

**Goals:**

- Vender en pocos gestos y que salga una factura emitida y numerada.
- Que el POS no duplique nada de lo que facturación ya sabe hacer.
- Que un fallo previsible se vea al abrir la pantalla, no con el cliente delante.

**Non-Goals:**

- Cobro, turnos, descuentos, clientes como entidad, devoluciones, tique.
- Que el POS sepa que existen las existencias.

## Decisions

### La venta es una factura, y el POS no tiene entidad propia

No hay `Sale`, ni `Ticket`, ni estado de venta. El POS produce una factura corriente.

Una entidad paralela era la alternativa y es la que se descarta con más convicción: duplicaría el
modelo del documento, crearía una segunda fuente de verdad sobre la misma transacción y obligaría a
mantener sincronizadas dos cosas que son la misma. El registro fiscal ya existe; el POS es una forma
rápida de llegar a él.

### Facturación abre su puerta con una capacidad, no con sus repositorios

`invoice/app.ts` expone **una** cosa nueva, `CounterSales`, con dos preguntas: qué plantillas sirven
para vender, y vende estas líneas.

Lo cómodo era exponer `InvoiceRepository`, `Issuance`, `TemplateRepository` y las funciones de
aritmética, y que el POS los orquestara. Se descarta por lo mismo que numeración no expuso
`chooseRange`: con cuatro piezas fuera, el consumidor acaba conociendo el orden en que se combinan, y
ese orden pasa a ser contrato sin que nadie lo haya escrito. Con una capacidad, el interior puede
cambiar entero.

### Cerrar emite, y un rechazo no deja borrador

`sell` crea el borrador, lo emite y, si la emisión se rechaza, **borra el borrador** antes de
devolver el motivo.

Dejarlo era la alternativa —la venta quedaría recuperable en el editor— y se descarta porque el
rechazo típico es «no hay rango vigente», que no se arregla desde el POS y se repetiría en cada
intento: la lista de facturas se llenaría de borradores idénticos de una venta que nunca ocurrió. Lo
que el cajero escribió sigue en su pantalla, así que no pierde nada. `deleteDraft` ya se niega a
borrar un emitido, de modo que un rechazo no puede llevarse por delante un documento fiscal.

### La aritmética no se reimplementa

Los importes de línea y los totales los calcula `CounterSales` con las mismas funciones que ya usa el
editor, y no el POS.

Reimplementarlas en el POS habría sido más directo y rompería el requisito de que la aritmética
ocurra en un único sitio. Además fallaría solo: la emisión comprueba que los importes cuadran, así
que un céntimo de diferencia rechazaría la venta sin explicar por qué.

### La plantilla se comprueba al abrir, no al cerrar

Al abrir la pantalla, `sellableTemplates` devuelve sólo las plantillas cuyos campos obligatorios el
POS puede rellenar —los caminos de ítem, el cliente y lo que escribe el sistema—. Si no hay ninguna,
la pantalla lo dice y no deja vender.

Comprobar al cerrar era lo natural de escribir y es el peor momento posible: el cajero descubre que
no puede facturar con el cliente esperando y la mercancía fuera. Un fallo previsible se adelanta al
único instante en que todavía no cuesta nada.

### El POS no sabe que existe el stock

En ninguna parte del POS se nombran las existencias. El descuento ocurre porque `stock-on-issue`
engancha en la emisión.

Es la prueba de que el corte entre los cambios 2 y 3 estaba bien puesto: si el descuento hubiera
vivido en el POS, facturar a mano no movería stock y habría que acordarse de ello para siempre.

## Risks / Trade-offs

- **Rechazo, y el borrado del borrador también falla** → queda un borrador huérfano, visible en la
  lista de facturas y borrable a mano. Es el peor caso y no pierde ni descuadra nada.
- **El POS y el editor podrían divergir al construir los datos** → no pueden: los construye
  `CounterSales`, que es de facturación. El POS envía líneas, no datos de documento.
- **`invoice/app.ts` deja de estar vacío** → con una sola capacidad y dos preguntas, que es la
  superficie más estrecha que resuelve el problema. Lo que no está ahí sigue siendo privado.
- **Una plantilla que pide un campo raro deja al POS sin vender** → se ve al abrir, con el nombre del
  campo que falta, y se arregla en el editor de plantillas.

## Migration Plan

No hay nada que migrar: es una superficie nueva. Sin plantillas que sirvan, la pantalla lo explica y
el resto de la aplicación no se entera.

## Open Questions

- Si hay varias plantillas vendibles, el POS ofrece elegir y usa la primera por defecto. Recordar la
  última elegida por cajero es una comodidad que no se construye hasta que alguien la pida.
