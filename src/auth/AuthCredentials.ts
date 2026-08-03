import { Env, Password, singleton } from '@wabot-dev/framework'

function requiredValue(env: Env, name: string): string {
  const value = env.requireString(name).trim()
  if (value.length === 0) throw new Error(`Env Variable ${name} is required`)
  return value
}

@singleton()
export class AuthCredentials {
  readonly email: string
  private readonly passwordHash: string

  constructor(env: Env) {
    if (!env) throw new Error('AuthCredentials requires the environment')
    this.email = requiredValue(env, 'AUTH_EMAIL').toLowerCase()
    this.passwordHash = Password.hash({ password: requiredValue(env, 'AUTH_PASSWORD') })
  }

  matches(email: unknown, password: unknown): boolean {
    if (typeof email !== 'string' || typeof password !== 'string') return false
    const sameEmail = email.trim().toLowerCase() === this.email
    const samePassword = Password.isValid({ password, hash: this.passwordHash })
    return sameEmail && samePassword
  }
}
