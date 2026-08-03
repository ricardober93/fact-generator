## Why

Al arrancar, el propio framework avisa:

```
view GET /invoices/:id: parameterized app views should declare swr.version(params)
so boosted navigation can revalidate per parameter without re-rendering
```

`InvoiceController` e `TemplateController` son `app: true`, así que la navegación entre sus
vistas es «boosted»: el cliente pide un fragmento y guarda la respuesta en una caché
stale-while-revalidate. Sin `swr.version`, cada vuelta a una factura **ejecuta el handler y
pinta el documento entero en el servidor** solo para calcular un hash y, casi siempre,
contestar `304`. Se paga el render completo para descubrir que no había nada que cambiar.

Y hay un segundo hallazgo, que apareció al leer cómo el framework usa `version` y que pesa
más que el aviso: **cuando una vista declara `swr.version`, el `ETag` deja de ser el hash del
contenido y pasa a ser la versión declarada** (`runUiControllers.js`, línea 329). Si esa
versión no recoge alguna entrada que la página sí pinta, el navegador se queda con un
fragmento viejo y no hay nada que lo corrija. `/templates/:id` ya declara
`swr: { version: revisionOf }`, y `revisionOf` solo mira `template.rev` — pero la página
también pinta la lista de imágenes disponibles. **Subir una imagen nueva no invalida el editor
de plantillas**, y no hay ningún aviso que lo delate.

**Corregido al implementar**: ese fallo es _latente_, no está vivo. `AssetRepository.upload()`
no lo llama ningún controlador: hoy no existe ninguna ruta HTTP que cree una `Asset`, así que
el selector de imágenes del inspector siempre se pinta vacío y nadie puede provocar la página
caducada. La clave incompleta es real y está en el código; lo que no es real es el impacto de
hoy. Se arregla igualmente porque cuesta una línea y porque el día que se conecte la subida
—que es cuando alguien mirará el selector, no el `ETag`— el fallo aparecería ya en marcha y sin
avisar.

O sea: el aviso es de rendimiento, pero la pieza que el aviso pide es de corrección, y la que
ya existe está incompleta.

## What Changes

- `/invoices/:id` declara `swr.version`, y el aviso de arranque desaparece.
- La versión se calcula como **hash del contenido que la página realmente lee**, no como un
  contador de revisión: la factura no tiene campo `rev` y no se le añade.
- **Corrección**: `revisionOf` en `/templates/:id` pasa a recoger también el conjunto de
  imágenes, que hoy ignora. Subir una imagen deja de servir un editor caducado.
- Una prueba por vista que fija la propiedad que importa: si cambia algo que la página pinta,
  la versión cambia.

Sin cambios en el modelo de datos: ninguna entidad gana un campo, ninguna tabla se migra.

## Capabilities

### New Capabilities

- `boosted-nav-cache`: cómo se versiona una vista parametrizada bajo navegación boosted — qué
  entradas debe recoger la clave, qué garantía da (nunca servir contenido viejo) y qué pasa
  cuando la clave se queda corta.

### Modified Capabilities

Ninguna. No cambia ningún requisito ya escrito: las facturas y las plantillas siguen
guardándose, listándose y pintándose igual. Lo que cambia es cuándo el navegador puede
reutilizar lo que ya tenía.

## Impact

**Código tocado**: `InvoiceController.tsx` (una función de versión y una línea en el `@view`) y
`TemplateController.tsx` (`revisionOf` amplía lo que recoge). Ningún cuerpo de handler cambia.

**Datos**: ninguna migración. Se descarta explícitamente añadir `rev` a `Invoice` —ver
`design.md`—: un hash del contenido no puede dar un falso acierto, y un campo `rev` que alguien
se olvide de incrementar sí.

**Rendimiento**: la vuelta a una factura ya visitada deja de pintar el documento en el
servidor. El coste que queda es leer la factura y las plantillas, que es lo mismo que ya se
lee, menos el render.

**Riesgo**: es el punto delicado del cambio. Una clave incompleta no falla ruidosamente, sirve
contenido viejo. Por eso la decisión de diseño es recoger de más antes que de menos, y por eso
cada vista lleva su prueba de invalidación.

## Fuera de alcance

Este cambio **no reabre** ninguna decisión cerrada del proyecto:

- **Sin paginación en pantalla.** Sigue siendo la única pregunta abierta de ARCHITECTURE.md §7
  y sigue sin resolverse aquí. Nada de `paged.js`.
- **Sin bloqueo optimista para facturas.** `Template` tiene `rev` y detecta conflictos;
  `Invoice` no, y aquí sigue sin tenerlo. Que la escritura simultánea de dos facturas pise
  datos es un problema real, pero es otro cambio: este solo lee.
- **Sin tocar la autenticación.** `/invoices` y `/templates` siguen tras `RequireSession`, y la
  versión se calcula dentro de la petición ya autenticada.
- **Sin `@view({ static })`** en ninguna ruta con sesión, por la razón de siempre: una vista
  estática se salta los middlewares.
- **Sin caché compartida entre visitantes.** La caché de navegación boosted vive en el cliente
  y es de esa pestaña. Aquí no se añade ninguna caché de servidor.
- **Sin dependencias npm nuevas.** El hash sale de `node:crypto`, que el proyecto ya usa para
  el `contentHash` de las imágenes.
- El resto sigue intacto: documento presentacional y no fiscal, milímetros, bandas, PDF solo
  por impresión del navegador, imágenes en base64 en la entidad `Asset`.
