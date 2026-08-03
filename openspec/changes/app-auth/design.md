## Context

Ver `proposal.md` para el porqué y `specs/app-auth/spec.md` para el qué. Aquí solo va el cómo.

El punto de partida cambia el tamaño del problema: **el framework ya trae casi todo**. Verificado
leyendo el paquete instalado, no la documentación:

| Pieza                             | Qué hace ya                                                                                                 | Origen                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `JwtConfig.cookieName`            | Lee `JWT_COOKIE_NAME`, por defecto `wabot_jwt`                                                              | `addon/auth/jwt/JwtConfig.js`          |
| `JwtGuardMiddleware`              | Busca el token **en la cookie** y cae a la cabecera `Authorization`; verifica y hace `auth.assign(payload)` | `addon/auth/jwt/JwtGuardMiddleware.js` |
| `JwtSigner.signAccessToken(info)` | Firma un token sin tocar la base de datos                                                                   | `addon/auth/jwt/JwtSigner.js`          |
| `Cookies`                         | `get` / `set` / `clear` con `httpOnly`, `sameSite`, `secure`, `maxAge`; inyectable por petición             | `feature/rest-controller/Cookies.js`   |
| `Password`                        | `hash` / `isValid` (scrypt) y `generate`                                                                    | raíz del paquete                       |
| `@uiController({ middlewares })`  | Guardias a nivel de controlador; `@uiMiddleware` para una sola vista o acción                               | skill `wabot-ui`                       |

Lo que este cambio añade es, literalmente, el pegamento: de dónde salen las credenciales, cómo se
convierte un 401 en una redirección, y una pantalla con un formulario.

Restricción del proyecto que aplica aquí: `@view({ static })` se salta los middlewares
(ARCHITECTURE.md §6), así que ninguna ruta autenticada puede marcarse estática. Ya estaba escrito;
este cambio solo añade rutas a las que aplica.

## Goals / Non-Goals

**Goals:**

- Cerrar `/invoices` y `/templates`, y la acuñación de handoffs, con el mínimo código propio.
- Que un navegador sin sesión acabe siempre en el formulario de acceso, nunca en una pantalla de
  error sin salida.
- Cero dependencias npm nuevas.
- Que el descuido de arrancar sin secreto sea imposible, no improbable.

**Non-Goals:**

- Modelo de permisos, roles o propiedad de datos. Ver "Fuera de alcance" en `proposal.md`.
- Renovación silenciosa de sesión.
- Proteger `GET /embed/:token`.

## Decisions

### 1. La sesión es un JWT en cookie, no una sesión opaca en base de datos

**Elegido**: firmar un token y ponerlo en la cookie que el guardia del framework ya lee.

**Alternativa descartada**: entidad `Session` con token opaco, `@repository`, y un cron de limpieza.
Sería revocable al instante, pero son tres archivos y una tabla para reimplementar algo que ya
existe y ya está probado en el framework.

**Techo conocido**: un JWT no se puede revocar antes de que expire. Con un único operador,
"revocar" es cambiar `JWT_SECRET` y reiniciar, que invalida todas las sesiones de golpe. Cuando
haya varios operadores y haga falta echar a uno sin echar al resto, esa decisión se reabre — y ese
día ya habrá una entidad de usuario donde colgarlo.

### 2. `JwtSigner.signAccessToken`, no `Jwt.createToken`

`Jwt.createToken()` hace tres cosas: firma el access token, **crea y persiste un `JwtRefreshToken`**,
y devuelve el secreto de refresco. Las dos últimas no las queremos: una UI con cookie larga no
renueva nada en silencio, así que cada acceso dejaría una fila muerta en la base de datos y un
problema de limpieza a cambio de nada.

`JwtSigner` firma y ya. Sin tabla, sin filas, sin cron.

**Consecuencia que hay que atender**: la vida de la sesión pasa a ser la del access token, y su
valor por defecto son **600 segundos** (`JwtConfig`). Diez minutos de sesión son inservibles para
trabajar. `JWT_ACCESS_EXPIRATION_SECONDS` debe fijarse explícitamente en `.env.example` con un
valor de jornada; si no se fija, el operador vuelve al login cada diez minutos y creerá que la
aplicación está rota.

### 3. `RequireSession` delega en `JwtGuardMiddleware` y solo traduce el fallo

```
RequireSession.handle(req, res, container)
  └─ intenta JwtGuardMiddleware.handle(req, res, container)
       ├─ pasa  → no hace nada: Auth ya quedó asignado
       └─ lanza → res.redirect(302, '/login?next=<ruta pedida>')
```

**Por qué no verificar el token nosotros**: el guardia del framework ya resuelve el orden
cookie-antes-que-cabecera, fija el algoritmo al verificar (no acepta el que anuncie el token) y
asigna el `Auth` con el que después trabaja el resto. Reimplementarlo es duplicar una verificación
de seguridad que puede desincronizarse de su propia configuración. Nuestro middleware es la
traducción de un error a una redirección, y nada más.

### 4. Credenciales en el entorno, con hash al arrancar

`AuthCredentials` es un `@singleton` que lee `AUTH_EMAIL` y `AUTH_PASSWORD` del `Env`, pasa la
contraseña por `Password.hash` una sola vez al construirse y expone `matches(email, password)`
comparando con `Password.isValid`. El texto en claro no sobrevive al constructor.

**Alternativa descartada**: `AUTH_PASSWORD_HASH`, para que el `.env` nunca contenga la contraseña.
Se descarta mientras ese mismo fichero siga guardando `JWT_SECRET` y la clave de OpenAI: el
perímetro es el fichero, y añadir un script de hasheo no mueve ese perímetro ni un centímetro,
solo añade un paso que documentar. El día que los secretos vivan en un gestor externo, esto se da
la vuelta.

**Nota sobre `Env`**: solo expone `requireString` y `requireNumber` (verificado en
`core/env/Env.js`). El indicador `Secure` de la cookie se lee como cadena y se compara, no hay
`requireBool`.

### 5. El destino de vuelta va en la query, y se valida como ruta local

`?next=/invoices/42`. Sin cookie de estado ni sesión previa: no hay nada que guardar.

La validación vive en una función pura, `localPathOr(next, fallback)`, que acepta el valor **solo**
si empieza por una barra y su segundo carácter no es otra barra ni una contrabarra. Eso rechaza
`https://malo.example`, `//malo.example` y `/\malo.example` —esta última porque algunos navegadores
normalizan la contrabarra a barra y la tratan como protocolo-relativa—. Cualquier otra cosa cae al
destino por defecto.

Función pura, sin servidor ni base de datos de por medio: es la pieza con más filo de todo el
cambio y la más barata de probar a fondo.

**Corregido durante la implementación**: el aviso de error también viaja por la query, como
código (`?error=credenciales`), no como texto. Un `@action` devuelve **JSON**, no HTML renderizado
en el servidor: devolver la página desde `signIn` serializaba el árbol de nodos en lugar de
pintarlo. El acceso usa por tanto post/redirect/get —el patrón que la propia documentación del
framework recomienda para formularios sin JavaScript—: el POST responde 302 y el GET siguiente
pinta el aviso. Efecto secundario bienvenido: como lo que viaja es un código y la vista lo traduce
a texto, no hay forma de reflejar en el HTML nada que haya escrito quien envía el formulario.

### 6. El freno de fuerza bruta vive en memoria del proceso

`LoginAttempts` guarda un contador por IP en un `Map`. Al llegar al límite, rechaza durante una
ventana; un acierto limpia la entrada.

`ponytail:` techo asumido — el contador se reinicia con el proceso y no se comparte entre
instancias. Con un proceso y un operador, alcanza. La vía de subida, si algún día hay varias
instancias, es el `Locker` del framework o una entidad; no hace falta anticiparla.

**Alternativa descartada**: contador en base de datos. Una escritura por intento fallido y un
trabajo de limpieza, para una amenaza que un bloqueo de sesenta segundos ya vuelve inviable.

### 7. Sin dependencias npm nuevas

Regla del proyecto: justificar cada dependencia nueva contra la alternativa nativa o ya instalada.
**No hay ninguna.** `jsonwebtoken` entra por el framework, `Password` usa `node:crypto`, la cookie
la escribe `Cookies` sobre express, y el formulario es HTML. `package.json` no se toca.

### 8. Estructura

`src/auth/`, carpeta hermana de `invoice/`, sin barrel: el scanner la encuentra por los decoradores.

```
src/auth/
  AuthController.tsx     @uiController('/login'): vista + signIn + signOut
  RequireSession.ts      el guardia (decisión 3)
  AuthCredentials.ts     @singleton, lee el entorno y hashea (decisión 4)
  LoginAttempts.ts       el freno (decisión 6)
  localPath.ts           validación del destino (decisión 5)
  session.ts             ISession = { email }
  ui/LoginPage.tsx       el formulario, sin island
```

`Auth<ISession>` se tipa con `session.ts` en todo el proyecto; nada más entra en el payload del
token, porque todo lo que entra viaja en cada petición y es legible por quien tenga la cookie.

### 9. Cómo se prueban las rutas protegidas

`createUiHarness` **no** acepta la opción `jwt` que sí tiene `RestHarness` (verificado en
`testing/index.d.ts`), pero acepta `register`. Con eso corre el `JwtGuardMiddleware` real:

```
createUiHarness({
  controllers: [...],
  register: [[JwtConfig, new TestJwt().config]],
})
```

La cookie se manda con `headers: { Cookie: 'wabot_jwt=' + testJwt.sign({ email }) }` y el 302 se
captura con `redirect: 'manual'`. `TestJwt.signInvalid()` da el token firmado con otro secreto para
el caso de cookie manipulada.

## Risks / Trade-offs

- **La sesión no se puede revocar antes de expirar** → cambiar `JWT_SECRET` y reiniciar las
  invalida todas. Con un operador es suficiente; ver decisión 1.
- **El valor por defecto de la vida del token son 10 minutos** → se fija explícitamente en
  `.env.example` con un valor de jornada. Es el fallo más probable de esta entrega y el más
  desconcertante para quien lo sufra: la sesión se cae sola sin explicación.
- **No hay token CSRF en el formulario** → la mitigación es `SameSite=Lax`: un POST desde otro sitio
  no lleva la cookie, así que las acciones protegidas no se pueden disparar desde fuera. El techo es
  que `Lax` no separa subdominios; si algún día se sirve otra cosa bajo el mismo dominio registrable,
  hay que revisarlo.
- **`JWT_SECRET` pasa a ser obligatorio para arrancar** → rompe cualquier arranque existente hasta
  que se añada al `.env`. Es deliberado (ver spec), pero hay que añadirlo al `.env` local en la
  misma entrega o el proyecto deja de arrancar en desarrollo.
- **La contraseña vive en claro en `.env`** → el fichero ya es el perímetro de `JWT_SECRET` y de la
  clave de OpenAI. No empeora nada; ver decisión 4.
- **El embed sigue siendo legible por token sin sesión** → decidido explícitamente en la propuesta.
  El token es inadivinable y caduca a los diez minutos, y ahora solo puede acuñarlo alguien con
  sesión.
- **El freno es por proceso** → ver decisión 6.

## Migration Plan

1. Añadir `JWT_SECRET`, `AUTH_EMAIL`, `AUTH_PASSWORD` y `JWT_ACCESS_EXPIRATION_SECONDS` al `.env`
   local y al `.env.example`. Sin esto la aplicación no arranca.
2. Desplegar. No hay migración de datos: ninguna entidad cambia, ninguna columna se añade.
3. Quien tuviera el embed integrado y llamara a `prepare` sin sesión, deja de poder hacerlo — es el
   punto **BREAKING** de la propuesta. Hoy no hay ningún integrador externo, así que no afecta a
   nadie.

**Vuelta atrás**: quitar `middlewares: [RequireSession]` de los dos controladores y el
`@uiMiddleware` de `prepare` devuelve el comportamiento anterior sin tocar datos. Las variables de
entorno pueden quedarse puestas.

## Open Questions

Ninguna que bloquee. La primera que aparecerá cuando haga falta un segundo operador —entidad
`User`, alta, y qué pasa con la revocación— es un cambio propio, no un fleco de este.
