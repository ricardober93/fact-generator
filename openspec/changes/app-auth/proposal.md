## Why

Las tres superficies del proyecto están abiertas de par en par: `/templates`, `/invoices` y
`/embed` no tienen ni un guardia, así que cualquiera que alcance el puerto lee, edita y borra
todas las facturas y todos los diseños. ARCHITECTURE.md §7 ya da por supuesta una sesión
—"las cookies de sesión ya funcionan"— que nunca se llegó a construir.

Mientras no exista, la aplicación no puede salir de `localhost`. Es el único punto que bloquea
ponerla en un servidor.

## What Changes

- Nueva pantalla de acceso en `/login`: formulario HTML plano, sin JavaScript ni island.
- **Un solo operador**, sembrado desde el entorno (`AUTH_EMAIL`, `AUTH_PASSWORD`). Sin entidad
  `User`, sin registro, sin pantalla de administración de usuarios.
- La sesión es la **cookie que el framework ya sabe leer**: `JwtGuardMiddleware` busca el token en
  la cookie que nombra `JwtConfig.cookieName` antes de mirar la cabecera `Authorization`. Se firma
  con `JwtSigner.signAccessToken`; no se emiten refresh tokens ni se persiste sesión alguna.
- Guardia `RequireSession` sobre `/templates` y `/invoices`: sin sesión válida, redirección 302 a
  `/login` conservando el destino para volver a él tras entrar.
- Cierre de sesión: acción que caduca la cookie y devuelve a `/login`.
- Límite de intentos fallidos por IP en el acceso, para que un formulario de contraseña expuesto a
  Internet no sea un oráculo de fuerza bruta.
- **BREAKING**: `POST /embed/_action/prepare` pasa a exigir sesión. Hoy cualquiera puede acuñar
  handoffs anónimamente y llenar la base de datos.
- `GET /embed/:token` **no cambia**: sigue bastando un token vigente.
- `.env.example` gana `JWT_SECRET` (pasa a ser obligatorio para arrancar), `AUTH_EMAIL` y
  `AUTH_PASSWORD`.

## Capabilities

### New Capabilities

- `app-auth`: quién puede entrar, cómo se demuestra la identidad, qué rutas exigen sesión, cómo
  viaja y caduca esa sesión, cómo se cierra, y qué hace el sistema ante credenciales erróneas o
  repetidas.

### Modified Capabilities

- `invoice-embed`: acuñar un handoff pasa a exigir sesión; renderizar uno por token sigue sin
  exigirla.

## Impact

**Código nuevo**: `src/auth/` — controlador de acceso, guardia `RequireSession`, configuración de
credenciales. Es una carpeta hermana de `invoice/`, sin registro central: el scanner la encuentra
sola.

**Código tocado**: la configuración del decorador en `TemplateController` e `InvoiceController` (una
línea cada uno: `middlewares: [RequireSession]`), y `EmbedController.prepare` (un `@uiMiddleware`).
Ningún cuerpo de handler cambia.

**Entorno**: `JWT_SECRET` pasa a ser obligatorio — sin él, `JwtConfig` lanza al construirse y la
aplicación no arranca. Es intencionado: una app protegida que arranca sin secreto es una app sin
protección.

**Datos**: ninguna migración. No se añade entidad, ni columna, ni campo a las existentes.

**Tests**: `createUiHarness` no acepta la opción `jwt` de `RestHarness`, pero sí `register`, así que
se inyecta la `JwtConfig` de `TestJwt` y corre el `JwtGuardMiddleware` real. Las peticiones llevan
la cookie por `headers` y el 302 se captura con `redirect: 'manual'`.

## Fuera de alcance

Este cambio **no reabre** ninguna decisión cerrada del proyecto:

- **Sin multi-tenant.** Los datos siguen siendo compartidos: quien entra ve y edita todas las
  facturas y todos los diseños. No se añade `ownerId` a ninguna entidad. La autenticación es una
  cerradura en la puerta, no un modelo de permisos.
- **Sin entidad `User`**, sin registro público, sin invitaciones, sin recuperación de contraseña,
  sin roles ni permisos. Un segundo operador se añade el día que haga falta, y será su propio
  cambio.
- **Sin refresh tokens** ni renovación silenciosa. La cookie caduca y se vuelve a entrar.
- **Sin API keys, sin tokens firmados por tenant, sin CSP por tenant** (ARCHITECTURE.md §7).
- **Sin 2FA, OAuth ni SSO.**
- El resto sigue intacto: documento presentacional y no fiscal, milímetros, bandas, PDF solo por
  impresión del navegador, logos en base64 en la entidad `Asset`, bloques que guardan referencias a
  token y nunca literales.

**Una enmienda explícita, decidida en esta propuesta.** ARCHITECTURE.md §7 dice que el embed va
autenticado por cookie de sesión. Aquí se separa en dos: **acuñar** el handoff exige sesión,
**renderizarlo** solo exige el token. El motivo es que el embed está pensado para pintarse dentro
del iframe de otro producto, donde nuestra cookie puede no existir; el token, que es inadivinable y
caduca a los diez minutos, ya es la credencial de esa vista. El resultado protege lo que importaba
—nadie ajeno puede crear documentos— sin romper el caso de uso del iframe. `@view({ static })` sigue
prohibido en esa ruta por la misma razón de siempre.
