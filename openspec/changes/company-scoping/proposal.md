## Why

Hoy el **emisor de la factura es texto libre**. `data.emisor.nombre` se teclea documento a documento,
igual que el nombre del cliente, porque para un documento presentacional los dos eran lo mismo: datos
que la plantilla pinta. Desde `invoice-issuance` ya no lo son. Quien emite es siempre el mismo, su NIT
y su razón social identifican legalmente cada documento, y el rango de numeración —la resolución— se
le concede **a él**, no a la aplicación.

Un registro fiscal en el que la identidad del emisor se vuelve a teclear en cada documento tiene dos
fallos que no se arreglan después: dos facturas del mismo emisor pueden salir con nombres distintos
por una errata, y el rango de numeración no tiene dueño. Ese es el motivo real para que exista
`Company`, y llega antes que cualquier necesidad de multi-empresa.

Encima de eso, el brief pide multi-empresa, multi-sede y roles, y `app-auth` reconoce hoy **un solo
operador sembrado desde el entorno**, sin tabla de usuarios ni modelo de permisos. Cada persona que
entre a partir de la segunda comparte credencial, y ningún documento sabe quién lo emitió.

## What Changes

- **`Company`**: NIT, razón social, dirección, régimen y logo. Es el emisor, y hay que crear una
  antes de emitir nada.
- **El rango de numeración pertenece a una empresa.** La resolución se concede a un NIT; un rango sin
  dueño no es una resolución, es un contador.
- **Emitir congela el emisor**, igual que congela el número: NIT y razón social quedan en el documento
  emitido, no se resuelven al pintarlo. Si mañana la empresa cambia de razón social, los documentos ya
  entregados siguen diciendo lo que decían.
- **BREAKING — los caminos `emisor.*` dejan de teclearse.** Salen de la empresa, como el número sale
  del rango. Es la tercera excepción a «el formulario se deriva del schema», y la última.
- **`User` y sesión por persona.** Se acaba el operador del entorno: alta de usuarios, contraseña con
  el `Password` del framework, y la sesión dice **quién** es, no solo que alguien entró.
- **Roles**: administrador, cajero y solo lectura. Menos que los cinco del brief, porque supervisor de
  sede y admin de empresa no se distinguen de nada mientras no haya sedes ni segunda empresa.
- **`companyId` en cada consulta** de facturas, plantillas, assets y rangos.
- **Cada documento guarda quién lo emitió**, congelado con el resto.

## Capabilities

### New Capabilities

- `company-profile`: la empresa emisora —sus datos, su logo, y la garantía de que un documento emitido
  congela los suyos en vez de resolverlos al pintar—.
- `user-accounts`: personas con credenciales propias, su alta, su sesión y el rastro de quién emitió
  cada documento.
- `access-control`: qué puede hacer cada rol y qué responde el sistema cuando alguien intenta lo que
  no le toca.

### Modified Capabilities

- `app-auth`: desaparece el operador único sembrado desde el entorno; la identidad pasa a la base de
  datos y la sesión deja de ser anónima dentro de la aplicación.
- `invoice-numbering`: un rango pertenece a una empresa, y la regla de no solapamiento pasa a ser por
  empresa.
- `invoice-records`: se añaden emisor y autor congelados; los caminos `emisor.*` dejan de ser campos
  del formulario.

## Impact

**Se hace en dos entregas, y la primera vale sola.** `company-profile` + el rango con dueño + el
emisor congelado resuelven un fallo que ya existe hoy, con una empresa y un operador. `user-accounts`
y `access-control` no tienen todavía a nadie que los pida: llegan cuando entre la segunda persona.
Meterlo todo en un despliegue solo consigue que la parte urgente espere a la que no lo es.

**Datos existentes**: los documentos ya emitidos tienen su emisor en `data.emisor.*` y **se quedan
como están** —están congelados, y congelado significa que tampoco los toca una migración—. La empresa
se crea a mano y los borradores pasan a leer sus datos de ella.

**`app-auth` se reescribe entero**, no se retoca: «no existe entidad de usuario en la base de datos»
es un MUST NOT que este cambio elimina.

**Sin sedes ni cajas.** El brief las pide desde el día 1; siguen sin tener un lector. Repartir la
numeración entre cajas ya funciona con rangos disjuntos, que es lo único para lo que hacían falta.

## Fuera de alcance

- **Sin sedes (`branch`) ni cajas (`cash_register`) como entidades.** Ver arriba: rangos disjuntos.
- **Sin invitaciones por correo, sin recuperación de contraseña, sin 2FA.** El alta la hace un
  administrador. Todo eso es aditivo.
- **Sin permisos por documento.** Un rol dice qué se puede hacer, no sobre cuáles.
- **Sin cambiar la emisión, la numeración, la congelación ni el repintado**, más allá de darle dueño
  al rango y emisor al documento.
- **Sin API para otras apps.** Sigue sin haber otra app.
