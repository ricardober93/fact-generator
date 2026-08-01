## 1. El tipo del documento

- [x] 1.1 Crear `src/invoice/render/document.ts` con los tipos: `IDocument`, `IPage`,
      `ITheme`, `IParamSchema`, `IBand`, `IBlock`, y el nombre fijo de las cinco bandas.
      Todo en milímetros como `number`. Sin imports del framework.
- [x] 1.2 Añadir `emptyDocument()`: A4 vertical (210×297 mm), márgenes de 15 mm, las cinco
      bandas presentes con alto por defecto y sin bloques.
- [x] 1.3 Añadir los tipos del contenido de texto como estructura de fragmentos
      (literal / enlace a dato), sin cadenas de HTML.

## 2. El registro de tipos de bloque

- [x] 2.1 Crear `src/invoice/render/blocks/registry.ts` con `defineBlock()`, el registro y
      la resolución de `kind` → definición. El campo `render` puede quedar como stub: este
      cambio no renderiza.
- [x] 2.2 Definir el descriptor de schema (`'string' | 'number' | 'boolean' | 'token' |
'enum:a,b,c' | 'asset'`) y `applyDefaults(kind, partial)`.
- [x] 2.3 Crear los cuatro tipos: `text.ts`, `image.ts`, `box.ts`, `line.ts`, cada uno con
      su schema y sus defaults en mm.
- [x] 2.4 `registry.unit.test.ts`: el registro devuelve los cuatro tipos; un `kind`
      desconocido no resuelve; `applyDefaults` completa un bloque creado solo con su
      `kind`.

## 3. Validación del documento

- [x] 3.1 Implementar `validateDocument(doc)` en `document.ts`: devuelve **todos** los
      problemas con la ruta del campo culpable, es pura y no muta la entrada.
- [x] 3.2 Reglas de estructura: las cinco bandas exactas (ni falta ni sobra ninguna),
      medidas numéricas y positivas, `kind` presente en el registro, propiedades dentro del
      schema de su tipo.
- [x] 3.3 Reglas de geometría: `x + ancho` cabe en el ancho útil (página menos márgenes) y
      `y + alto` cabe en el alto declarado de **su** banda.
- [x] 3.4 Reglas de tema: un bloque referencia tokens con `@`, nunca literales; todo token
      referenciado existe en el tema del documento.
- [x] 3.5 `document.unit.test.ts`: `emptyDocument()` es válido; ida y vuelta por
      `JSON.stringify`; un documento con tres errores devuelve los tres; validar dos veces
      da el mismo resultado; la entrada no se modifica.
- [x] 3.6 Guardar en `src/invoice/render/__fixtures__/` un documento realista de factura
      (logo, datos de cliente, tabla de ítems, totales) que sirva de golden file al resto
      de capabilities. El scanner ignora los directorios que empiezan por `__`.

## 4. Parámetros del embed

- [x] 4.1 Implementar `resolveTheme(doc, params)`: aplica sobre el tema los parámetros
      declarados en el schema del documento.
- [x] 4.2 Un parámetro no declarado se ignora; un valor fuera del enumerado declarado se
      ignora y conserva su valor por defecto.
- [x] 4.3 `params.unit.test.ts` cubriendo los tres casos: parámetro válido aplicado, no
      declarado ignorado, valor inadmisible ignorado.

## 5. Entidad y repositorio de plantillas

- [x] 5.1 Crear `src/invoice/models/template/Template.ts`: `ITemplateData` con `name`,
      `doc: IDocument` y `rev: number`.
- [x] 5.2 Crear `TemplateRepository.ts` con `@repository({ table: 'template' })` y las
      consultas por nombre de método que hagan falta (`findByName…`). Sin capa de servicios.
- [x] 5.3 Implementar el guardado con bloqueo optimista dentro de
      `locker.withKey(template).run(...)`: leer, comparar la `rev` recibida contra la
      almacenada, y escribir incrementando `rev`. En conflicto, devolver la `rev` actual y
      el documento almacenado.
- [x] 5.4 Rechazar la escritura si `validateDocument` falla, antes de tocar la base de datos.
- [x] 5.5 `TemplateRepository.unit.test.ts` con `useMemoryRepositories()`: guardar y
      recuperar sin pérdida; escritura con la `rev` correcta incrementa a `rev + 1`; dos
      escrituras desde la misma `rev` — la segunda se rechaza y el documento de la primera
      queda intacto; un documento inválido no se persiste.

## 6. Entidad y repositorio de assets

- [x] 6.1 Crear `src/invoice/models/asset/Asset.ts`: `IAssetData` con `mime`, `bytes` en
      base64 y `size`. El id es el SHA-256 del contenido.
- [x] 6.2 Implementar la detección de tipo por magic bytes (PNG, JPEG, WebP) más la
      detección textual de SVG. El `mime` que declare el cliente se descarta.
- [x] 6.3 Implementar el límite de tamaño del servidor en 64 kb de bytes decodificados,
      en la constante `MAX_ASSET_BYTES` (sin comentario: CLAUDE.md los prohíbe).
- [x] 6.4 Crear `AssetRepository.ts`: la subida hashea el contenido y, si el id ya existe,
      devuelve el asset existente sin escribir.
- [x] 6.5 Añadir `toDataUri(asset)` → `data:<mime>;base64,<bytes>`. No exponer ninguna
      función que devuelva el markup de un SVG.
- [x] 6.6 `AssetRepository.unit.test.ts`: subir dos veces la misma imagen devuelve el mismo
      id y deja una sola fila; un contenido cuyos magic bytes no son admitidos se rechaza
      aunque se declare `image/png`; un contenido por encima del límite se rechaza; un PNG
      válido produce una data URI que empieza por `data:image/png;base64,`.
- [x] 6.7 Verificar que listar plantillas no devuelve bytes de imagen: los assets se
      referencian por id desde el documento.

## 7. Cierre

- [x] 7.1 `npm run tsc` sin errores.
- [x] 7.2 `npm run test:unit` en verde.
- [x] 7.3 `npm run fmt`.
- [x] 7.4 Comprobar que ningún archivo bajo `src/invoice/render/` importa
      `@wabot-dev/framework` (solo `@wabot-dev/framework/ui`, o nada).
