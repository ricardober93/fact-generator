import { Env, singleton } from '@wabot-dev/framework'

function requiredValue(env: Env, name: string): string {
  const value = env.requireString(name).trim()
  if (value.length === 0) throw new Error(`Env Variable ${name} is required`)
  return value
}

@singleton()
export class AuthCredentials {
  readonly email: string
  readonly password: string

  constructor(env: Env) {
    if (!env) throw new Error('AuthCredentials requires the environment')
    this.email = requiredValue(env, 'AUTH_EMAIL').toLowerCase()
    this.password = requiredValue(env, 'AUTH_PASSWORD')
  }
}
