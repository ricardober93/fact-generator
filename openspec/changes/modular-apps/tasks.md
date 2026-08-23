Un commit por movimiento, sin mezclar cambios de contenido, para que `git log --follow` siga
sirviendo. Va **antes** que `company-scoping` y `catalog-source`.

## 1. El kernel, con su puerta

- [ ] 1.1 `src/kernel/versionKey.ts`: mover desde `invoice/versionKey.ts`, que ya usan tres archivos
- [ ] 1.2 `src/kernel/paths.ts`: `resolvePath`, `missingRequiredPaths` y **un solo** `writePath`
      genérico, que hoy está duplicado entre `ui/invoiceEdits.ts` y `Invoice.ts`. Es el sitio donde el
      coste de la firma genérica se paga una vez
- [ ] 1.3 `src/kernel/cents.ts`: la aritmética de céntimos que hoy vive en `render/money.ts` y que ya
      consumen el formulario y la comprobación de emisión
- [ ] 1.4 `src/kernel/outcome.ts`: el tipo del resultado `{ status }` que repiten `InvoiceRepository`,
      `TemplateRepository` y `chooseRange`
- [ ] 1.5 `render/` importa del kernel y **sigue sin importar la raíz del framework**: el kernel es
      puro por definición, así que el bundle del island no engorda. Comprobarlo con `npm run build`,
      que es lo único que detecta esa rotura
- [ ] 1.6 Escribir la regla de admisión en `src/kernel/README.md`: sin dominio, dos consumidores ya
      existentes, sin estado ni IO ni decoradores, y el techo. Va ahí y no solo en ARCHITECTURE porque
      se lee justo cuando alguien está a punto de añadir el archivo de más

## 2. Numbering como aplicación

- [ ] 2.1 Mover `invoice/models/numberRange/` a `src/numbering/models/`, y su controlador y su página
      a `src/numbering/`
- [ ] 2.2 `src/numbering/app.ts`: expone el repositorio de rangos y el tipo de un rango consumible. No
      expone `chooseRange`, ni la entidad entera, ni sus consultas internas
- [ ] 2.3 `docType` pasa a `series: string`; el getter lee `series ?? docType` para que los rangos
      guardados se lean sin migración, como se hizo con `rev` y `estado`
- [ ] 2.4 Los mensajes de rechazo dejan de nombrar «facturas»: los compone quien llama
- [ ] 2.5 `invoice/` importa `numbering/app` y nada más de dentro
- [ ] 2.6 Tests: un rango guardado con `docType` se lee como serie sin paso previo; una serie
      desconocida se acepta

## 3. La emisión como servicio

- [ ] 3.1 `invoice/Issuance.ts`: `@injectable` con `InvoiceRepository`, el repositorio de rangos desde
      `numbering/app` y `Locker`; se lleva `issueInvoice`, `createCreditNoteFor`, `stamp` e `isTaken`
- [ ] 3.2 `InvoiceRepository` se queda con crear, guardar, borrar y consultar, y **deja de inyectar**
      otros repositorios. Su constructor es la comprobación de que el reparto salió bien
- [ ] 3.3 `InvoiceController` inyecta `Issuance` para emitir y corregir
- [ ] 3.4 Mover las pruebas de emisión y notas de crédito junto al servicio, sin cambiar aserciones

## 4. El controlador, solo rutas

- [ ] 4.1 `InvoiceDtos.ts` y `invoiceVersion.ts`: sacar DTO, clave de versión y ayudantes de error
- [ ] 4.2 Comprobar que `InvoiceController.tsx` baja de 250 líneas y solo contiene rutas y acciones
- [ ] 4.3 `invoice/app.ts`: qué expone facturación —hoy, nada que otro módulo necesite; el archivo se
      crea igual, con esa lista vacía escrita y explicada, porque una superficie vacía declarada dice
      algo y una superficie ausente no dice nada

## 5. La arquitectura, escrita

- [ ] 5.1 ARCHITECTURE.md §2: el módulo como aplicación, la forma de la carpeta, `app.ts` como
      superficie —y por qué no es un barril—, y la regla de no alcanzar el interior ajeno
- [ ] 5.2 ARCHITECTURE.md §5: `shared/` deja de estar prohibido y pasa a estar **condicionado**. Dejar
      escrito el argumento viejo y por qué la puerta lo responde: el cajón de sastre es el resultado
      de no tener criterio de entrada, no de tener carpeta
- [ ] 5.3 ARCHITECTURE.md §5: matizar la capa de servicios —prohibido el que reenvía, permitido el que
      orquesta varios agregados— y que la diferencia se ve en el constructor
- [ ] 5.4 ARCHITECTURE.md: las cuatro reglas de frontera rigen dentro y fuera del proceso, y por eso
      sacar un módulo a la red será un cambio de despliegue y no un rediseño

## 6. Cierre

- [ ] 6.1 Comprobar que ningún archivo de `render/blocks/`, `document.ts` ni `render.tsx` aparece en el
      diff
- [ ] 6.2 Comprobar a mano que ningún módulo importa el interior de otro: `grep` de `from '../<otro>/`
      que no termine en `/app`
- [ ] 6.3 Comprobar que ningún archivo pasa de 250 líneas ni ninguna función de 25
- [ ] 6.4 Puerta de calidad completa: `npm run tsc`, `npm run test:unit`, `npm run fmt:check` y
      `npm run build` —el último porque mover archivos rompe el bundle del island sin que `tsc` diga
      nada—
