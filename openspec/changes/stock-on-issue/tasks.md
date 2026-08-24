Este cambio **no se puede aplicar antes que `inventory-catalog`**: usa su artículo, su cantidad y su
libro. No modifica ninguno de sus requisitos, así que no hay delta que refrescar, pero sí un orden
que respetar.

## 1. La capacidad de consumo

- [ ] 1.1 `inventory/app.ts` expone `consumeStock(owner, [{ ref, quantity }], reason, by, at)`.
      Recibe referencias y cantidades, **nunca** la factura ni sus ítems: Inventario no aprende qué es
      un documento, igual que numeración no aprende qué es una factura
- [ ] 1.2 Resolver `ref` → artículo de esa empresa. Lo que no resuelve se salta y se informa como
      saltado, no como error
- [ ] 1.3 Cada resta aplicada escribe cantidad y movimiento por el **mismo camino único** que ya usa
      el ajuste a mano, bajo el `rev` del artículo. No se añade una segunda vía de escritura
- [ ] 1.4 Cantidad negativa permitida: no hay comprobación de disponibilidad en ninguna parte
- [ ] 1.5 Devuelve qué se aplicó y qué no, como valor. Nada de excepciones para lo previsto
- [ ] 1.6 Tests: resta y deja movimiento con motivo y autor; una `ref` que no resuelve se salta sin
      error; se puede bajar de cero; el signo positivo devuelve al almacén; **sembrando dos
      empresas**, una `ref` de otra empresa no resuelve

## 2. El consumo pendiente

- [ ] 2.1 `inventory/models/PendingConsumption.ts`: documento, referencia, cantidad, motivo del fallo
      e instante. Entidad **aparte** del movimiento, deliberadamente: nada se movió
- [ ] 2.2 Nada lo suma al libro ni a la cantidad. La invariante de `inventory-stock` —la suma del
      libro explica la cantidad— sigue valiendo sin filtrar nada al leer
- [ ] 2.3 Sin reintento automático, sin cola, sin trabajo programado. Se cierra con un ajuste a mano
- [ ] 2.4 Tests: un consumo que no se puede aplicar deja pendiente con sus cuatro datos; con
      pendientes, la suma del libro sigue cuadrando con la cantidad

## 3. El enganche en la emisión

- [ ] 3.1 `Issuance.assign`: consumir **justo después** de `await this.invoices.update(invoice)`,
      dentro del cerrojo `invoice:<id>` que ya existe. Antes de esa línea, no
- [ ] 3.2 Extraer de los ítems los pares `{ ref, cantidad }` usando `ITEM_REF_KEY` e
      `ITEM_QUANTITY_KEY`. Saltar la línea sin cantidad utilizable con **el mismo criterio** que
      `checkArithmetic`, reutilizando su lectura de cantidad en vez de escribir una segunda
- [ ] 3.3 El signo lo decide el tipo de documento: `notaCredito` devuelve, el resto consume. Una sola
      llamada, no dos caminos
- [ ] 3.4 Ninguna excepción del consumo sale de `issueInvoice`: lo que falle se escribe como
      pendiente y la respuesta de emitir es idéntica con o sin fallo
- [ ] 3.5 Tests: una venta baja las existencias; el movimiento apunta al documento y a quien emitió;
      un cajero emite y mueve stock aunque no pueda ajustar a mano; líneas a mano no mueven nada;
      referencias ajenas no mueven nada ni registran fallo; una línea sin cantidad no mueve y las
      demás sí; se vende más de lo que hay y queda negativo; una nota de crédito devuelve; **un
      consumo que falla deja el documento emitido y la misma respuesta**; reemitir no mueve una
      segunda vez; dos emisiones simultáneas consumen una sola vez

## 4. Que se vea

- [ ] 4.1 Pantalla de consumos pendientes, con la misma forma que las demás: formulario normal, sin
      island. Vacía es el estado normal y lo dice
- [ ] 4.2 Enlace desde el artículo con pendientes, para que se encuentre desde donde se nota el
      descuadre y no sólo desde un menú
- [ ] 4.3 Guardas por ruta: verla, administrador y lectura; el ajuste que la cierra ya exige
      administrador por el requisito que ya existe
- [ ] 4.4 Tests de UI: sin pendientes lo dice; con pendientes los lista con documento, referencia,
      cantidad y motivo

## 5. Lo escrito

- [ ] 5.1 `ARCHITECTURE.md` **y** `openspec/config.yaml`, los dos: lo irreversible no depende de lo
      reversible, y por eso el consumo va detrás de la persistencia y su fallo no la deshace. Son dos
      archivos y el que se inyecta en cada artefacto es el segundo
- [ ] 5.2 Documentar que con `CATALOG_URL` puesta no se mueve nada, y que es correcto y silencioso:
      las referencias son ajenas y no resuelven a ningún artículo propio

## 6. Cierre

- [ ] 6.1 **Pendiente de manos humanas.** Recorrido a mano: vender un artículo y ver bajar su
      cantidad; vender más de lo que hay y ver el negativo; emitir una nota de crédito y ver volver la
      mercancía; reemitir y comprobar que no baja dos veces
- [ ] 6.2 Comprobar que la batería entera pasa **sin ninguna variable de origen configurada**
- [ ] 6.3 Puerta de calidad completa: `npm run tsc`, `npm run test:unit` y `npm run fmt:check`
