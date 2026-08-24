Depende de `inventory-catalog` para tener catálogo. **No depende de `stock-on-issue`**: sin él la
venta funciona igual y el stock no se mueve. El POS no nombra las existencias en ninguna parte.

## 1. La puerta de facturación

- [ ] 1.1 `src/invoice/CounterSales.ts`: servicio que orquesta `InvoiceRepository`, `Issuance` y
      `TemplateRepository`, como ya hace `Issuance` con los suyos. Es la primera cosa que
      `invoice/app.ts` va a exponer, así que la superficie se decide aquí
- [ ] 1.2 `sellableTemplates(companyId)`: devuelve sólo las plantillas cuyos campos obligatorios el
      POS puede rellenar —caminos de ítem, cliente, y lo que escribe el sistema—, y para las que no,
      qué campo lo impide
- [ ] 1.3 `sell({ companyId, templateId, customer, lines })`: construye los datos del documento
      **aquí**, no en el POS, con las mismas funciones de aritmética que usa el editor. Crear, emitir,
      y devolver la factura o el rechazo tal como lo da la emisión
- [ ] 1.4 Si la emisión se rechaza, borrar el borrador antes de devolver el motivo. `deleteDraft` ya
      se niega a borrar un emitido, así que un rechazo no puede llevarse por delante un documento
      fiscal
- [ ] 1.5 `invoice/app.ts` expone **sólo** `CounterSales` y sus tipos. Ni el repositorio, ni
      `Issuance`, ni las funciones de aritmética: con cuatro piezas fuera, el orden en que se combinan
      se convierte en contrato sin que nadie lo escriba
- [ ] 1.6 Tests: vender dos líneas deja una factura emitida y numerada; no queda borrador; los
      importes cuadran y la emisión no los rechaza; un rechazo no deja borrador y devuelve el motivo;
      un rechazo posterior a la emisión no borra el documento; una plantilla con un obligatorio que el
      POS no rellena no sale como vendible, y dice cuál es

## 2. La pantalla

- [ ] 2.1 `src/pos/PosController.tsx` y `src/pos/app.ts`, con la forma de los demás módulos
- [ ] 2.2 Island de venta: buscar en el catálogo, añadir línea, cambiar cantidad, quitar, corregir
      descripción y precio a mano, escribir una línea sin catálogo, y ver el total al momento
- [ ] 2.3 El cliente sale relleno con el valor de mostrador y se puede cambiar antes de cerrar
- [ ] 2.4 Con varias plantillas vendibles se elige, con una por defecto; sin ninguna, la pantalla dice
      qué campo lo impide y no deja vender
- [ ] 2.5 Al cerrar, un solo gesto: llamar a `sell` y pintar el resultado. El rechazo se muestra y
      **las líneas siguen en pantalla**
- [ ] 2.6 Guardas por ruta: vender es de cajero y de administrador; lectura no
- [ ] 2.7 Tests de UI: elegir del catálogo añade la línea; la cantidad cambia el total; una línea a
      mano se vende igual; quitar una del medio no toca las otras; cerrar deja factura emitida y la
      lista de facturas la muestra; sin rango vigente se dice y no queda borrador; sin plantillas
      vendibles no se puede vender; lectura no vende; sin sesión responde como cualquier ruta
      protegida

## 3. Lo escrito

- [ ] 3.1 `ARCHITECTURE.md` **y** `openspec/config.yaml`, los dos: el POS es la tercera superficie
      sobre el mismo motor, una venta no es un documento distinto, y la tabla de módulos deja de decir
      que `invoice/` no expone nada. Son dos archivos y el que se inyecta en cada artefacto es el
      segundo
- [ ] 3.2 Anotar por qué el POS no menciona el stock: el descuento cuelga de la emisión, y si viviera
      aquí, facturar a mano no movería existencias

## 4. Cierre

- [ ] 4.1 **Pendiente de manos humanas.** Recorrido a mano: vender dos artículos del catálogo y uno
      escrito a mano, comprobar el total, cerrar, y ver la factura emitida en la lista con su número;
      con `stock-on-issue` aplicado, comprobar además que las existencias bajaron sin que el POS diga
      nada de ellas
- [ ] 4.2 Comprobar que la batería entera pasa **sin ninguna variable de origen configurada**
- [ ] 4.3 Puerta de calidad completa: `npm run tsc`, `npm run test:unit` y `npm run fmt:check`
