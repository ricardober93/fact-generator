El orden importa: los grupos 1 y 2 construyen Inventario sin que nadie lo consuma, y el 3 es el que
cambia la frontera. Hecho al revés, el selector de facturas se queda roto entre medias.

## 1. El artículo

- [x] 1.1 `src/inventory/models/Article.ts`: entidad con `owner`, `code`, `name`, `unitPrice` y
      `taxRate`. Getters, sin lógica de catálogo: no sabe que existen las facturas
- [x] 1.2 `src/inventory/models/ArticleRepository.ts`: `createArticle` exige empresa, código y
      nombre, y rechaza un precio negativo; `findForOwner(owner)` y `search(owner, text)` reciben la
      empresa como parámetro, nunca inyectada
- [x] 1.3 `search` encuentra por código y por nombre, y devuelve lista vacía cuando no hay nada
- [x] 1.4 Escritura con bloqueo optimista por `rev`, como el resto de entidades
- [x] 1.5 Tests: se crea con sus cuatro campos; sin código o sin nombre no se crea; precio negativo
      no se crea; busca por código y por nombre; sin coincidencias devuelve vacío. **Sembrando dos
      empresas**, para que el filtro tenga algo que filtrar: el listado sólo trae los suyos, pedir
      uno ajeno responde como si no existiera, y el mismo código en otra empresa sí vale

## 2. Las existencias

- [x] 2.1 `Article` gana la cantidad, que empieza en cero al crearse
- [x] 2.2 `src/inventory/models/StockMovement.ts`: entidad con artículo, lo que varió, motivo,
      instante y autor con su nombre
- [x] 2.3 `adjustStock(owner, articleId, delta, reason, by, at)`: **un solo camino** que escribe la
      cantidad y el movimiento, bajo el `rev` del artículo. Ningún otro sitio toca la cantidad
- [x] 2.4 Motivo vacío o ausente rechaza el ajuste y deja la cantidad igual, con su error tipado
- [x] 2.5 `app.ts` expone la **operación**, no la cantidad: nadie de fuera puede escribirla a mano
- [x] 2.6 Tests: nace en cero y sin movimientos; ajustar cambia la cantidad y deja movimiento; la
      suma del libro coincide con la cantidad tras dos ajustes; sin motivo no se ajusta y la cantidad
      no se mueve; el movimiento guarda motivo, instante y nombre del autor; renombrar al usuario no
      cambia el nombre ya guardado

## 3. La frontera: el origen deja de ser sólo HTTP

- [x] 3.1 `src/catalog/CatalogSource.ts` pasa a declarar la **interfaz** `ICatalogSource` con las dos
      preguntas, ahora con la empresa delante: `search(owner, text)` y `findByRef(owner, ref)`
- [x] 3.2 La implementación HTTP de hoy se queda tal cual detrás de la interfaz, recibiendo el dueño
      y **ignorándolo**: un origen externo tiene su propio alcance, y dos firmas distintas para el
      mismo contrato serían peor
- [x] 3.3 `LocalCatalogSource` en `src/catalog/`, inyectando `ArticleRepository` desde
      `inventory/app.ts`. Vive aquí y no en Inventario para que Inventario no aprenda el vocabulario
      de quien lo consume. Dirección: `invoice → catalog → inventory`, sin ciclo
- [x] 3.4 La elección: con `CATALOG_URL` puesta manda el externo; sin ella, el local si existe.
      Nunca los dos, nunca mezclando resultados
- [x] 3.5 `configured` pasa a `available`: lo que decide si hay selector es que haya origen, no que
      haya variable
- [x] 3.6 Actualizar el único llamador —el editor de facturas— a la firma nueva. El compilador lo
      señala; no hay despliegue anterior con la firma vieja
- [x] 3.7 Tests: sin variable y sin catálogo local no hay origen ni llamadas; sin variable y con
      catálogo local el selector sale y lo que ofrece viene del local; con variable manda el externo
      y no se consulta el local; una `ref` del local se devuelve carácter a carácter; el local filtra
      por empresa y no ofrece artículos de otra

## 4. La pantalla

- [x] 4.1 `src/inventory/ArticleController.tsx`: listar, alta, edición y ajuste de existencias, con
      la misma forma que la pantalla de rangos y la de empresa —formulario normal, sin island
- [x] 4.2 El ajuste pide el motivo en el mismo formulario: sin motivo no se puede enviar, y el
      servidor lo vuelve a comprobar aunque el cliente ya lo haga
- [x] 4.3 Guardas por ruta: alta, edición, borrado y ajuste sólo para administrador; consultar
      también para cajero y lectura
- [x] 4.4 Tests de UI: el cajero ve el catálogo y su alta se rechaza antes de tocar el dominio;
      lectura no edita ni ajusta; sin sesión responde como cualquier ruta protegida sin revelar si el
      rol habría bastado; guardar un ajuste cambia lo que pinta el listado

## 5. Lo escrito

- [x] 5.1 `ARCHITECTURE.md` **y** `openspec/config.yaml`, los dos: Inventario deja de vivir en otro
      repositorio y pasa a ser módulo hermano, y el origen de catálogo deja de ser siempre una URL
      configurada. Son dos archivos y el que se inyecta en cada artefacto es el segundo; tocar sólo
      el primero ya dejó la arquitectura atrás una vez
- [x] 5.2 `.env.example`: documentar que con `CATALOG_URL` puesta el catálogo local queda invisible,
      que es la consecuencia querida de que nunca haya dos orígenes
- [x] 5.3 `src/inventory/README.md` no: el módulo no necesita puerta documentada, la puerta es
      `app.ts`. Se anota aquí para que nadie lo añada «por simetría» con `kernel/`

## 6. Cierre

- [ ] 6.1 **Pendiente de manos humanas.** Recorrido a mano: dar de alta artículos, ajustar
      existencias con motivo, abrir una factura y comprobar que el selector ofrece el catálogo local
      sin ninguna variable puesta; después poner `CATALOG_URL` y comprobar que el local desaparece
- [x] 6.2 Comprobar que la batería entera pasa **sin ninguna variable de origen configurada**
- [x] 6.3 Puerta de calidad completa: `npm run tsc`, `npm run test:unit` y `npm run fmt:check`
