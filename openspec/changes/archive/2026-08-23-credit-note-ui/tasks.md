## 1. La acción de corregir

- [x] 1.1 `InvoiceController.correct(InvoiceIdDto)`: llama a `createCreditNoteFor` y responde
      `redirect('/invoices/<id>')` al borrador nuevo, como ya hace `remove`
- [x] 1.2 Tests de la acción: sobre una factura emitida crea la nota y redirige a ella; sobre un
      borrador se rechaza; la factura corregida no cambia

## 2. El botón

- [x] 2.1 `InvoiceToolbar`: botón «Corregir» con `data-action="correct"`, visible solo cuando el
      documento está emitido y es una factura —una nota de crédito no se corrige a su vez—
- [x] 2.2 El island **no manda nada**: el botón es un `<form method="post">` a la acción, y el
      navegador sigue la redirección solo. Se comprobó que el runtime del framework no intercepta
      `submit` en ninguna parte, así que la navegación es nativa —y funciona con JavaScript
      desactivado, como el formulario de acceso—
- [x] 2.3 Tests: una factura emitida trae el botón; un borrador no; una nota de crédito emitida
      tampoco

## 3. El motivo

- [x] 3.1 `SaveInvoiceDto`: campo `correctionReason` opcional y validado como texto
- [x] 3.2 `InvoiceEditor.island.tsx`: señal del motivo, campo pintado junto al formulario solo si
      `docType` es nota de crédito, marcado obligatorio, y enviado en cada guardado
- [x] 3.3 El island recibe `docType` y `correctionReason` desde `InvoiceController.editor`
- [x] 3.4 Tests: el borrador de una nota de crédito trae el campo; el de una factura no; escribir y
      guardar conserva el motivo; emitir sin motivo sigue avisando con el texto de `issueOutcome`

## 4. La referencia

- [x] 4.1 Cabecera en el editor con el prefijo y el número guardados en `corrects`, enlazando a
      `/invoices/<id>` de la factura corregida
- [x] 4.2 `InvoiceList`: una factura emitida muestra si tiene notas de crédito que la corrigen,
      resolviéndolo con una consulta por `corrects`, sin contador guardado
- [x] 4.3 Tests: la nota enseña y enlaza la factura corregida; una factura no enseña referencia; la
      lista relaciona las dos

## 5. Cierre

- [ ] 5.1 **Pendiente de manos humanas.** Recorrido a mano: emitir una factura, corregirla, escribir el motivo, quitar una línea,
      emitir la nota y comprobar que la factura sigue intacta y que las dos se enlazan
- [x] 5.2 Puerta de calidad completa: `npm run tsc`, `npm run test:unit` y `npm run fmt:check`
