## Why

Las otras tres piezas del producto —el motor de render, el embed en iframe y el editor
drag-and-drop— manipulan todas el mismo objeto: el documento de factura. Mientras ese
objeto no tenga una forma escrita ni un sitio donde guardarse, no se puede empezar
ninguna de las tres. Es la única capability del proyecto que no admite trabajo en
paralelo: todo lo demás depende de ella.

Definirla primero también fuerza a cerrar ahora las preguntas que después salen caras:
qué es exactamente una banda, en qué unidad se miden las cosas, qué pasa cuando dos
pestañas guardan el mismo template, y dónde viven los logos.

## What Changes

- **Tipo del documento**: una estructura serializable en JSON que describe una factura
  —página, tokens de tema, schema de parámetros del embed, y las cinco bandas con sus
  bloques—. Vive en `invoice/render/document.ts`, en código puro sin IO, porque tanto el
  servidor como el navegador necesitan leerlo.
- **Cuatro tipos de bloque iniciales**: `text`, `image`, `box`, `line`. Cada uno con su
  schema y sus defaults, registrados en `invoice/render/blocks/`. El registro es el único
  eje de extensión del proyecto: un tipo nuevo es un archivo nuevo.
- **Validación e invariantes del documento** como funciones puras: un documento cargado
  de la base de datos puede ser antiguo o estar corrupto, y hay que poder decidir si es
  utilizable sin levantar un servidor.
- **Defaults**: `emptyDocument()` produce un documento A4 válido y vacío, que es lo que
  necesita el editor para el botón "nueva plantilla".
- **Entidad `Template` y su repositorio**, con el documento guardado como blob JSON y un
  campo `rev` para bloqueo optimista.
- **Entidad `Asset` y su repositorio**, separada de `Template`, guardando imágenes como
  data URI en base64 con validación de tipo por magic bytes.
- **Sin dependencias npm nuevas.**

No hay cambios rompientes: el proyecto no tiene todavía código de aplicación.

## Capabilities

### New Capabilities

- `invoice-document-model`: la forma del documento de factura y sus reglas. Qué bandas
  existen, qué es un bloque, cómo se expresan coordenadas y medidas, qué referencias a
  token admite un bloque, qué schema de parámetros declara el documento para su embed, y
  qué hace que un documento sea válido o inválido. Todo verificable llamando a funciones
  puras, sin servidor ni base de datos.

- `invoice-template-storage`: cómo se guardan y recuperan las plantillas y sus imágenes.
  Persistencia del documento, concurrencia entre dos editores sobre la misma plantilla, y
  el ciclo de vida de un asset —qué se acepta al subirlo, cómo se referencia desde un
  bloque y qué pasa cuando el bloque que lo usaba desaparece—.

### Modified Capabilities

Ninguna. No existen specs previas.

## Impact

**Código nuevo** (ninguno existente se modifica):

```
src/invoice/render/document.ts          tipos, invariantes, validación, emptyDocument()
src/invoice/render/blocks/registry.ts   defineBlock() y el registro
src/invoice/render/blocks/{text,image,box,line}.ts
src/invoice/models/template/Template.ts + TemplateRepository.ts
src/invoice/models/asset/Asset.ts + AssetRepository.ts
```

**Dependencias**: ninguna nueva. La validación del documento se escribe a mano porque los
validadores del framework (`@isString`) viven en la raíz del paquete, y `render/` no puede
importar la raíz sin romper el bundle del island.

**Persistencia**: dos tablas nuevas (`template`, `asset`) bajo el adaptador que elija el
runner. `Asset` va aparte de `Template` a propósito: el adaptador PG no proyecta columnas,
así que un `findAll()` de plantillas arrastraría cada logo en base64 si vivieran juntos.

**Aguas abajo**: `invoice-renderer`, `embed-iframe` y `template-builder` consumen el tipo
del documento y el registro de bloques definidos aquí. Un cambio posterior en la forma del
documento las toca a las tres.

## Fuera de alcance

Este cambio **no reabre** ninguna decisión ya cerrada, y en concreto:

- **No renderiza nada.** No hay HTML, ni CSS, ni bandas convertidas en `<thead>`. Eso es
  `invoice-renderer`. Aquí el documento es solo datos y reglas sobre esos datos.
- **No hay rutas HTTP, ni controladores, ni UI.** Ni el embed ni el editor entran todavía.
- **No hay drag-and-drop**, ni por tanto elección de librería de DnD.
- **Sigue sin haber dominio fiscal**: nada de XML, firma digital, CUFE ni catálogos
  SRI/DIAN/CFDI. El documento es presentacional.
- **Sigue sin haber PDF de servidor**: el único PDF es Ctrl+P del navegador.
- **Sigue sin haber multi-tenant**: sin API keys, sin tokens firmados, sin CSP por tenant.
- **Los logos siguen yendo en base64 en la base de datos**: sin S3, sin disco, sin ruta
  estática, sin multipart.
- **No se añade capa de servicios** entre controlador y repositorio, ni barrels `index.ts`,
  ni test de arquitectura.
