import type { VNode } from '@wabot-dev/framework/ui'

export interface ILoginPageProps {
  next: string
  error: string
}

export function LoginPage({ next, error }: ILoginPageProps): VNode {
  return (
    <main class="wb-login">
      <form class="card stack wb-login-card" method="post" action="/login/_action/signIn">
        <h1>Facturas</h1>
        {error ? (
          <p class="badge badge-danger" role="alert" data-login-error="true">
            {error}
          </p>
        ) : null}
        <div class="stack-sm">
          <label for="login-email">Correo</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autocomplete="username"
            required
            autofocus
          />
        </div>
        <div class="stack-sm">
          <label for="login-password">Contraseña</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>
        <input type="hidden" name="next" value={next} />
        <button type="submit" class="btn btn-block">
          Entrar
        </button>
      </form>
    </main>
  )
}

export const LOGIN_CSS = `
.wb-login {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--sp-4);
  background: rgb(var(--c-bg-sunken));
}

.wb-login-card {
  width: 100%;
  max-width: 22rem;
}

.wb-login-card input {
  width: 100%;
  background: rgb(var(--c-bg-contrast) / 0.55);
}

.wb-login-card label {
  font-size: var(--fs-xs);
  color: rgb(var(--c-fg-muted));
}
`
