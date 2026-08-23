## Context

El brief decidió «apps independientes que se conectan por API». Lo que no decidió es **qué viaja por
esa API**, y ahí es donde los ecosistemas se estropean: en cuanto una app consume el modelo de otra,
las dos quedan atadas y la palabra «independientes» pasa a ser decorativa.

Este cambio establece la forma de esa frontera usando el primer caso real —rellenar una línea de
factura desde un catálogo— y deja escrita la regla para los que vengan.

## Goals / Non-Goals

**Goals:**

- Que facturación no conozca el modelo de datos de ninguna otra aplicación.
- Que el proveedor pueda ser cualquiera: Inventario, un ERP existente, un CSV.
- Que la aplicación siga funcionando entera con cero apps alrededor.

**Non-Goals:**

- Diseñar Inventario. Ni su modelo, ni su interior, ni su repositorio.
- Resolver la escritura entre apps. Este contrato es de lectura.

## Decisions

### 1. El contrato lo escribe el **consumidor**, no el proveedor

Facturación declara qué necesita para rellenar una línea, y cualquiera que quiera servirle se adapta.
No al revés.

Es la diferencia entre un contrato de cinco campos y uno de cuarenta. Un `Product` de un sistema de
inventario tiene categoría, proveedor, ubicación, mínimos, costes: **nada de eso cabe en una línea de
factura**, y todo eso sería superficie que rompe cuando cambie.

_Alternativa descartada_: que Inventario publique su `Product` y facturación lo mapee. Es lo que
hacía `inventory-app`. Ata el consumidor al vocabulario del proveedor, y con dos consumidores el
proveedor ya no puede cambiar nada.

_Consecuencia_: el contrato vive **en este repositorio**, que es el que lo necesita. No hace falta un
repositorio compartido, ni un store, ni un paquete común. Eso era resolver el síntoma de haber puesto
el contrato en el sitio equivocado.

### 2. La referencia es **opaca**

`ref` es una cadena. Facturación la guarda y la devuelve; no la interpreta, no la parte, no construye
URLs con ella, no la usa como clave ajena.

Mientras sea opaca, el proveedor puede cambiar de identificadores, de base de datos o de esquema sin
que aquí se entere nadie. En cuanto alguien escriba `ref.split(':')` para sacar algo, la frontera se
rompió y nadie lo notará hasta el despliegue del otro lado.

_Consecuencia comprobable_: no hay ninguna consulta que filtre por partes de `ref`, ni ninguna ruta
que la reciba como parámetro que se interprete.

### 3. El documento congela lo que muestra; **no resuelve nada al leer**

La línea guarda su texto, su precio y su importe, como hoy. La `ref` se guarda **al lado**, no en
lugar de.

Pintar una factura **nunca** llama al catálogo. Si lo hiciera, un documento emitido dejaría de ser
reproducible —cambiaría cuando cambie el catálogo, o dejaría de pintarse cuando el catálogo esté
caído—, que es justo lo que `invoice-issuance` fue a garantizar. Es la misma regla que ya rige para
el emisor y el número, aplicada a través de la frontera entre apps.

### 4. La integración es **configuración**, no dependencia

Una variable de entorno con la URL base. Sin ella: no hay selector, no hay llamadas, no hay errores,
y escribir a mano es lo normal —que es literalmente lo que se hace hoy—.

Esto es lo que hace verdad la frase «cada app puede vivir sola» del brief, y es comprobable: la
batería de pruebas corre entera sin ningún proveedor.

_Alternativa descartada_: descubrimiento de servicios, registro central o un fichero de apps
instaladas. Infraestructura para un ecosistema de dos.

### 5. La versión va en la ruta y la pone el consumidor

`GET {CATALOG_URL}/v1/items?q=…` y `GET {CATALOG_URL}/v1/items/{ref}`. Si el contrato cambia, cambia
`/v2/` y un proveedor puede servir los dos mientras dure la transición.

### 6. Un origen caído no rompe una factura

Cualquier fallo del origen —sin respuesta, lento, con una forma que no encaja— degrada al mismo
sitio: **se escribe a mano**. Nunca a una página de error, nunca a un guardado bloqueado.

El origen es una comodidad para teclear menos. Tratarlo como una dependencia dura convertiría la
caída de otra aplicación en una parada de la facturación.

### 7. La regla general del ecosistema

Las seis decisiones anteriores no son de este caso, son de la frontera. Se escriben en
ARCHITECTURE.md para que la siguiente app no las vuelva a discutir:

1. **Una app publica capacidades pensadas para quien las consume, nunca su esquema.**
2. **Las referencias entre apps son cadenas opacas**: se guardan y se devuelven, no se interpretan ni
   se unen.
3. **Un documento congela lo que enseña**; no resuelve datos de otra app al leerlo.
4. **Toda integración es configuración**: cada app arranca y funciona con todas las demás ausentes.

## Risks / Trade-offs

- **Cada proveedor tiene que escribir un adaptador** → Es el coste, y es el correcto: cinco campos por
  proveedor, una vez, frente a que todos los consumidores conozcan el modelo de todos los proveedores.
- **El contrato se queda corto** —hará falta el descuento, o la unidad de medida— → Se añade un campo
  opcional y los proveedores que no lo sirvan siguen funcionando. Crece por donde duele, no por
  adelantado.
- **Dos proveedores a la vez** —catálogo propio y el de un cliente— no está previsto → Una URL, un
  origen. Cuando aparezca el segundo, la variable pasa a ser una lista y el selector agrupa por
  origen; el contrato no cambia.
- **`ref` sin proveedor detrás**, porque el origen cambió de URL → No pasa nada: la línea ya tiene su
  texto congelado y la `ref` solo servía para contar. Que se quede huérfana no rompe ningún documento.

## Migration Plan

Ninguna. Sin la variable configurada, no cambia absolutamente nada de lo que hay hoy.

## Open Questions

Ninguna.
