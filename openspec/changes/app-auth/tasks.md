## 1. Entorno y credenciales

- [x] 1.1 Añadir a `.env.example`: `JWT_SECRET`, `JWT_ACCESS_EXPIRATION_SECONDS` (valor de jornada,
      no el defecto de 600 s), `AUTH_EMAIL`, `AUTH_PASSWORD` y `AUTH_COOKIE_SECURE`, cada uno con un
      comentario de una línea
- [x] 1.2 Añadir esas mismas variables al `.env` local, para que `npm run dev` siga arrancando
- [x] 1.3 `src/auth/session.ts`: `ISession = { email: string }`, el único payload que viaja en el
      token
- [x] 1.4 `src/auth/AuthCredentials.ts`: `@singleton` que lee `AUTH_EMAIL` y `AUTH_PASSWORD` del
      `Env`, hashea con `Password.hash` en el constructor y expone `matches(email, password)` contra
      `Password.isValid`
- [x] 1.5 `AuthCredentials.unit.test.ts`: acepta las credenciales configuradas, rechaza contraseña
      equivocada y correo desconocido, no conserva el texto en claro, y falla al construirse si
      falta una variable

## 2. Piezas puras

- [x] 2.1 `src/auth/localPath.ts`: `localPathOr(next, fallback)` — admite el valor solo si empieza
      por `/` y su segundo carácter no es `/` ni `\`; cualquier otra cosa cae al `fallback`
- [x] 2.2 `localPath.unit.test.ts`: acepta `/invoices/42`; rechaza `https://malo.example`,
      `//malo.example`, `/\malo.example`, cadena vacía y ausente
- [x] 2.3 `src/auth/LoginAttempts.ts`: `@singleton` con contador por origen —
      `isBlocked(ip, now)`, `registerFailure(ip, now)`, `registerSuccess(ip)`— con límite y ventana
      como constantes y el instante como parámetro, para poder probar la caducidad sin esperar
- [x] 2.4 `LoginAttempts.unit.test.ts`: bloquea al agotar los intentos, un acierto pone la cuenta a
      cero, el bloqueo caduca al pasar la ventana

## 3. Guardia

- [x] 3.1 `src/auth/RequireSession.ts`: `IMiddleware` que delega en `JwtGuardMiddleware` y convierte
      su fallo en `302` a `/login?next=<ruta pedida>`; si el guardia pasa, no hace nada
- [x] 3.2 `RequireSession.unit.test.ts` con `createUiHarness` sobre un controlador de prueba y
      `register: [[JwtConfig, new TestJwt().config]]`: sin cookie redirige conservando el destino,
      con cookie válida pasa, con cookie firmada por otro secreto (`TestJwt.signInvalid()`) redirige

## 4. Pantalla de acceso

- [x] 4.1 `src/auth/ui/LoginPage.tsx`: formulario HTML plano (correo, contraseña, destino oculto y
      hueco para el aviso), sin island y sin JavaScript, vestido con el sistema de diseño
- [x] 4.2 `src/auth/AuthController.tsx`: `@uiController('/login')` reutilizando `AppLayout` como
      layout; `@view` pública que no declara `static` y que redirige al destino por defecto si ya
      hay sesión válida
- [x] 4.3 Acción `signIn`: comprueba el bloqueo, luego las credenciales, firma con
      `JwtSigner.signAccessToken({ email })`, escribe la cookie con `Cookies.set` (`httpOnly`,
      `sameSite: 'lax'`, `secure` según entorno, `maxAge` igual a la vida del token) y redirige a
      `localPathOr(next, '/invoices')`
- [x] 4.4 El fallo de `signIn` devuelve el mismo aviso genérico para correo desconocido y para
      contraseña incorrecta, sin reflejar la contraseña en el HTML
- [x] 4.5 Acción `signOut`: `Cookies.clear` con el mismo `path` y redirección a `/login`
- [x] 4.6 `AuthController.unit.test.ts`: acceso correcto (abre sesión y redirige al destino
      validado), credenciales erróneas (mismo aviso en los dos casos, sin cookie), destino externo
      descartado, bloqueo tras agotar intentos, cierre de sesión que caduca la cookie, y la vista con
      sesión que redirige en lugar de pedir credenciales

## 5. Cerrar las rutas

- [x] 5.1 `middlewares: [RequireSession]` en el `@uiController` de `InvoiceController`
- [x] 5.2 `middlewares: [RequireSession]` en el `@uiController` de `TemplateController`
- [x] 5.3 `@uiMiddleware(RequireSession)` sobre `EmbedController.prepare`, dejando la vista
      `:token` sin guardia
- [x] 5.4 Adaptar los tests existentes de `TemplateController`, `InvoiceUi` y `EmbedController`:
      registrar la `JwtConfig` de pruebas y mandar la cookie de sesión en las peticiones que ahora
      la exigen
- [x] 5.5 Tests nuevos de cierre: `/invoices` y `/templates` sin sesión redirigen sin filtrar
      contenido; `prepare` sin sesión no acuña ningún handoff; `GET /embed/:token` sin sesión sigue
      respondiendo 200 con la factura pintada

## 6. Salida y remates

- [x] 6.1 Botón o enlace de cerrar sesión visible en la aplicación, enviando a la acción `signOut`
- [x] 6.2 Actualizar la enmienda en `ARCHITECTURE.md` §7: acuñar un handoff exige sesión,
      renderizarlo por token no
- [x] 6.3 Comprobar la puerta de calidad completa: `npm run tsc`, `npm run test:unit` y
      `npm run fmt:check` en verde
- [x] 6.4 Arrancar la aplicación y comprobar a mano el recorrido: `/invoices` sin sesión lleva al
      acceso, entrar devuelve a `/invoices`, y cerrar sesión vuelve a cerrarlo todo
