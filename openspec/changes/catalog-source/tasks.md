## 1. El cliente del origen

- [x] 1.1 `src/catalog/CatalogSource.ts`: cliente con `search(text)` y `findByRef(ref)` contra
      `{CATALOG_URL}/v1/items`, con `fetch` nativo y un tiempo máximo por petición
- [x] 1.2 Validar la forma de cada elemento y **descartar** los incompletos en vez de romper; ignorar
      los campos que el contrato no declara
- [x] 1.3 Sin `CATALOG_URL` el cliente declara que no hay origen y no hace ninguna llamada
- [x] 1.4 Cualquier fallo —sin respuesta, lento, forma que no encaja— devuelve «sin resultados», nunca
      una excepción que suba a la vista
- [x] 1.5 Tests con un proveedor de mentira levantado en el propio test: búsqueda normal, elemento
      incompleto descartado, campos de más ignorados, origen caído, origen lento, respuesta que no es
      la forma declarada, y sin variable configurada

## 2. La línea

- [x] 2.1 La línea guarda `ref` opcional junto a sus valores; `applyChanges` la conserva
- [x] 2.2 Comprobar que ni el render ni ninguna vista llaman al origen: pintar es una función pura de
      lo guardado y esto no lo cambia
- [x] 2.3 Tests: la referencia sobrevive al guardado; una factura emitida no cambia aunque cambie el
      catálogo; una referencia huérfana se ve y se imprime

## 3. El selector

- [x] 3.1 `InvoiceLines`: buscador por línea, visible solo si hay origen configurado, que rellena
      descripción y precio y deja los dos editables
- [x] 3.2 El aviso de origen no disponible va junto al buscador y no bloquea nada del formulario
- [x] 3.3 Tests de UI: con origen aparece el buscador y elegir rellena la línea; sin origen no
      aparece; con el origen caído se puede escribir, guardar y emitir igual

## 4. La frontera, escrita

- [x] 4.1 **Ya estaba hecho**: la sección §5b de ARCHITECTURE se escribió al aplicar
      `modular-apps`, porque allí hizo falta para justificar la opacidad entre módulos. Se comprueba
      que sigue diciendo lo que este cambio necesita. ARCHITECTURE.md: sección de integración con las cuatro reglas de la decisión 7 —capacidades
      pensadas para quien consume y no esquemas; referencias opacas; el documento congela lo que
      enseña; toda integración es configuración—, para que la siguiente app no las vuelva a discutir
- [x] 4.2 `.env.example`: `CATALOG_URL` documentada como opcional, diciendo que sin ella la aplicación
      funciona entera
- [x] 4.3 Documentar el contrato que se pide —las dos rutas y los cinco campos— donde lo pueda leer
      quien vaya a implementarlo, que es el único trozo de este cambio que mira hacia afuera

## 5. Cierre

- [ ] 5.1 **Pendiente de manos humanas.** Recorrido a mano con un proveedor de mentira: elegir de catálogo, corregir el precio a mano,
      emitir, cambiar el catálogo y comprobar que el documento emitido no se mueve
- [x] 5.2 Comprobar que la batería entera pasa **sin ninguna variable de origen configurada**
- [x] 5.3 Puerta de calidad completa: `npm run tsc`, `npm run test:unit` y `npm run fmt:check`
