Un commit por movimiento, sin mezclar cambios de contenido, para que `git log --follow` siga
sirviendo. Va **antes** que `company-scoping` y `catalog-source`.

## 1. El controlador solo con rutas

- [ ] 1.1 `InvoiceDtos.ts`: mover `InvoiceIdDto`, `SaveInvoiceDto`, `IssueInvoiceDto`, `NewInvoiceDto`
      y los tipos de respuesta, sin tocar una sola anotación
- [ ] 1.2 `invoiceVersion.ts`: mover `versionOfInvoice` y los ayudantes de error
- [ ] 1.3 Comprobar que `InvoiceController.tsx` queda por debajo de 250 líneas y que solo contiene
      rutas y acciones
- [ ] 1.4 Las pruebas solo cambian de `import`. Si alguna cambia de aserción, anotarlo: estaba atada a
      la estructura y no al comportamiento

## 2. La numeración como módulo hermano

- [ ] 2.1 Mover `invoice/models/numberRange/` a `src/numbering/models/`, con `NumberRange`,
      `NumberRangeRepository` y `chooseRange`
- [ ] 2.2 Mover `NumberRangeController` y `NumberRangePage` a `src/numbering/`
- [ ] 2.3 `docType` pasa a `series: string`; el getter lee `series ?? docType` para que los rangos
      guardados se lean sin migración, igual que se hizo con `rev` y con `estado`
- [ ] 2.4 Borrar `models/docType.ts` de `invoice/` solo si deja de tener lectores; si facturación
      sigue necesitando su tipo cerrado, se queda **en facturación**, que es quien sabe qué significa
- [ ] 2.5 Los mensajes de rechazo dejan de nombrar «facturas»: los compone quien llama
- [ ] 2.6 Tests: un rango guardado con `docType` se lee como serie sin ningún paso previo; se crea un
      rango para una serie desconocida y se acepta

## 3. La emisión como servicio

- [ ] 3.1 `invoice/Issuance.ts`: `@injectable` que recibe `InvoiceRepository`, `NumberRangeRepository`
      y `Locker`, y se lleva `issueInvoice`, `createCreditNoteFor`, `stamp` e `isTaken`
- [ ] 3.2 `InvoiceRepository` se queda con crear, guardar, borrar y consultar, y **deja de inyectar**
      otros repositorios. Su constructor es la comprobación de que el reparto salió bien
- [ ] 3.3 `InvoiceController` inyecta `Issuance` para emitir y corregir, y el repositorio para el resto
- [ ] 3.4 Mover las pruebas de emisión y de notas de crédito junto al servicio, sin cambiar ninguna
      aserción

## 4. El patrón, escrito

- [ ] 4.1 ARCHITECTURE.md §2: la forma de un módulo —controlador en la raíz, `models/`, `ui/`, servicio
      si orquesta— y que se importa lo que un módulo expone en su raíz, no su interior
- [ ] 4.2 ARCHITECTURE.md §5: matizar la regla de la capa de servicios. Sigue prohibido el servicio que
      **reenvía** al repositorio; se permite el que **orquesta varios** agregados. La diferencia se ve
      en el constructor: uno inyecta un repositorio, el otro tres y un `Locker`
- [ ] 4.3 ARCHITECTURE.md: dejar constancia de que `render/` no se tocó, y por qué sigue sin tocarse

## 5. Cierre

- [ ] 5.1 Comprobar que ningún archivo de `render/`, `blocks/` ni `document.ts` aparece en el diff
- [ ] 5.2 Comprobar que ningún archivo pasa de 250 líneas ni ninguna función de 25
- [ ] 5.3 Puerta de calidad completa: `npm run tsc`, `npm run test:unit`, `npm run fmt:check` y
      `npm run build` —este último porque mover archivos puede romper el bundle del island sin que
      `tsc` diga nada—
