## ADDED Requirements

### Requirement: Hay un único operador y sus credenciales vienen del entorno

La aplicación DEBE (MUST) reconocer exactamente una identidad, definida por las variables de
entorno `AUTH_EMAIL` y `AUTH_PASSWORD`. NO DEBE (MUST NOT) existir registro público, ni entidad de
usuario en la base de datos, ni pantalla de alta.

Si falta cualquiera de las dos variables, o `JWT_SECRET`, la aplicación NO DEBE arrancar. Una
aplicación protegida que arranca sin secreto es una aplicación sin protección, y fallar al arrancar
es la única forma de que el descuido se note.

La contraseña NO DEBE conservarse en claro más allá del arranque: se convierte a hash con la
utilidad de contraseñas del framework y la comparación se hace siempre contra el hash.

#### Scenario: Arranque sin credenciales configuradas

- **WHEN** se intenta arrancar sin `AUTH_EMAIL`, sin `AUTH_PASSWORD` o sin `JWT_SECRET`
- **THEN** el arranque falla con un mensaje que nombra la variable que falta

#### Scenario: Las credenciales del entorno abren la sesión

- **WHEN** se envían el correo y la contraseña que declaran las variables de entorno
- **THEN** la sesión queda abierta

#### Scenario: La contraseña no se guarda en claro

- **WHEN** se inspecciona la configuración de credenciales ya construida
- **THEN** expone un hash y no el texto de la contraseña

### Requirement: La sesión viaja en una cookie no accesible desde JavaScript

Al autenticarse, el sistema DEBE (MUST) escribir la sesión en la cookie que lee el guardia del
framework, marcada `HttpOnly` y `SameSite=Lax`, con ámbito de raíz y una caducidad explícita.

La cookie DEBE contener un token firmado con `JWT_SECRET`. NO DEBE contener la contraseña, ni su
hash, ni ningún dato que permita reconstruirlos.

El indicador `Secure` DEBE poder activarse por configuración, para poder marcarlo al servir tras
HTTPS sin romper el desarrollo en local por HTTP.

#### Scenario: La cookie se marca HttpOnly

- **WHEN** el acceso termina correctamente
- **THEN** la respuesta trae una cookie de sesión con `HttpOnly` y `SameSite=Lax`

#### Scenario: La cookie no lleva credenciales

- **WHEN** se decodifica el contenido del token de la cookie
- **THEN** no aparece la contraseña ni su hash

#### Scenario: Una cookie manipulada no vale

- **WHEN** se pide una ruta protegida con una cookie firmada con otro secreto
- **THEN** la petición se trata como anónima

### Requirement: Las rutas de gestión exigen sesión

Todas las vistas y todas las acciones bajo `/invoices` y `/templates` DEBEN (MUST) exigir una
sesión válida. Sin ella, la respuesta DEBE ser una redirección al acceso, nunca la página pedida ni
una página de error 401.

Una redirección es lo correcto aquí porque quien llega es un navegador siguiendo un enlace: una
pantalla de error le deja sin salida, la redirección le lleva a donde puede resolverlo.

#### Scenario: Vista protegida sin sesión

- **WHEN** se pide `/invoices` sin cookie de sesión
- **THEN** responde 302 hacia el acceso y no incluye ninguna factura en el cuerpo

#### Scenario: Acción protegida sin sesión

- **WHEN** se envía una acción de guardado sin cookie de sesión
- **THEN** no se escribe nada y la respuesta no es un guardado correcto

#### Scenario: Con sesión válida se pasa

- **WHEN** se pide `/invoices` con una cookie de sesión válida
- **THEN** responde 200 con la página de facturas

#### Scenario: La sesión caducada se trata como ausente

- **WHEN** se pide una ruta protegida con una cookie cuyo token ya expiró
- **THEN** responde con la misma redirección al acceso

### Requirement: Tras entrar se vuelve al destino pedido, y ese destino se valida

El guardia DEBE (MUST) conservar la ruta que se pidió para volver a ella una vez abierta la sesión.

El destino NO DEBE (MUST NOT) usarse tal cual: solo se admite una ruta local del propio sitio. Un
destino que apunte a otro host, o que empiece por un esquema o por doble barra, DEBE descartarse y
sustituirse por el destino por defecto.

Sin esa validación, el formulario de acceso se convierte en un redirector abierto: un enlace a
nuestro dominio que acaba en el sitio de otro, con nuestra pantalla de contraseña por medio.

#### Scenario: Se vuelve a la página que se pidió

- **WHEN** se pide una ruta protegida sin sesión y a continuación se entra correctamente
- **THEN** la redirección final lleva a esa misma ruta

#### Scenario: Un destino externo se descarta

- **WHEN** se entra correctamente con un destino que apunta a otro host
- **THEN** la redirección lleva al destino por defecto y nunca a ese host

#### Scenario: Un destino protocolo-relativo se descarta

- **WHEN** el destino empieza por doble barra
- **THEN** se descarta igual que uno externo

### Requirement: Unas credenciales erróneas no dicen qué parte falló

Ante un correo desconocido o una contraseña incorrecta, el sistema DEBE (MUST) responder con el
mismo aviso genérico y sin abrir sesión. NO DEBE distinguir entre "ese usuario no existe" y "esa
contraseña no es".

La contraseña enviada NO DEBE (MUST NOT) volver al navegador en el HTML de la respuesta, ni
aparecer en los registros.

#### Scenario: Contraseña incorrecta

- **WHEN** se envía el correo correcto con una contraseña equivocada
- **THEN** no se abre sesión y se muestra el aviso genérico

#### Scenario: Correo desconocido

- **WHEN** se envía un correo que no es el configurado
- **THEN** el aviso es exactamente el mismo que con la contraseña equivocada

#### Scenario: La contraseña no se refleja

- **WHEN** falla un intento
- **THEN** el HTML de la respuesta no contiene el texto de la contraseña enviada

### Requirement: Los intentos fallidos se limitan por origen

Tras un número configurado de intentos fallidos consecutivos desde un mismo origen, el sistema DEBE
(MUST) rechazar los siguientes durante una ventana de tiempo, **incluso si las credenciales son
correctas**.

Un intento correcto antes de agotar el margen DEBE reiniciar la cuenta.

Un formulario de contraseña expuesto a Internet sin freno es un oráculo de fuerza bruta: sin límite,
probar el diccionario entero solo cuesta tiempo de red.

#### Scenario: Se bloquea tras agotar los intentos

- **WHEN** se agotan los intentos fallidos permitidos desde un origen
- **THEN** el siguiente intento se rechaza aunque las credenciales sean correctas

#### Scenario: Un acierto limpia la cuenta

- **WHEN** se falla algunas veces sin agotar el margen y después se acierta
- **THEN** la sesión se abre y la cuenta de fallos queda a cero

#### Scenario: El bloqueo caduca

- **WHEN** pasa la ventana de bloqueo
- **THEN** vuelve a admitirse un intento

### Requirement: La pantalla de acceso es pública, funciona sin JavaScript y no se cachea

La pantalla de acceso DEBE (MUST) ser alcanzable sin sesión y DEBE funcionar como formulario HTML
plano, sin island ni JavaScript de cliente.

NO DEBE (MUST NOT) declararse `@view({ static })`. Una vista estática se sirve desde caché
saltándose los middlewares y compartiendo un mismo documento entre visitantes, y esta pantalla
pinta estado propio de cada petición —el aviso de error y el destino pendiente—.

Con sesión ya abierta, pedir el acceso DEBE llevar al destino por defecto en lugar de volver a
pedir credenciales.

#### Scenario: Se llega al acceso sin sesión

- **WHEN** se pide la pantalla de acceso sin cookie
- **THEN** responde 200 con un formulario que envía correo y contraseña

#### Scenario: No está marcada como estática

- **WHEN** se inspecciona la configuración de la vista de acceso
- **THEN** no declara `static`

#### Scenario: Con sesión abierta no se vuelve a pedir

- **WHEN** se pide la pantalla de acceso con una cookie válida
- **THEN** responde con una redirección al destino por defecto

### Requirement: Cerrar sesión caduca la cookie

La aplicación DEBE (MUST) ofrecer una forma de cerrar sesión que caduque la cookie en el navegador y
devuelva a la pantalla de acceso.

Tras cerrarla, volver a una ruta protegida DEBE comportarse igual que no haber entrado nunca.

#### Scenario: La cookie se caduca

- **WHEN** se cierra la sesión
- **THEN** la respuesta caduca la cookie de sesión y redirige al acceso

#### Scenario: Después de cerrar, las rutas vuelven a estar cerradas

- **WHEN** se pide una ruta protegida tras cerrar sesión
- **THEN** responde con la redirección al acceso
