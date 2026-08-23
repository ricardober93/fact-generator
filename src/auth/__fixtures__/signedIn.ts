import { JwtConfig, type IConstructor } from '@wabot-dev/framework'
import {
  createUiHarness,
  TestJwt,
  type IUiRequestOptions,
  type IUiResponse,
  type UiHarness,
} from '@wabot-dev/framework/testing'

const OPERATOR = 'operador@example.com'

export interface ISessionOverrides {
  email?: string
  userId?: string
  role?: 'administrador' | 'cajero' | 'lectura'
  companyId?: string
}

const testJwt = new TestJwt()

export function sessionHeaders(overrides: ISessionOverrides = {}): Record<string, string> {
  const session = {
    email: overrides.email ?? OPERATOR,
    userId: overrides.userId ?? 'user-1',
    role: overrides.role ?? 'administrador',
    companyId: overrides.companyId ?? 'empresa-1',
  }
  return { Cookie: `${testJwt.config.cookieName}=${testJwt.sign(session)}` }
}

export const SESSION_REGISTRATIONS: [unknown, unknown][] = [[JwtConfig, testJwt.config]]

export interface ISignedInHarness {
  anonymous: UiHarness
  get(path: string, options?: IUiRequestOptions): Promise<IUiResponse>
  action(path: string, body?: unknown, options?: IUiRequestOptions): Promise<IUiResponse>
  close(): Promise<void>
}

function withSession(options: IUiRequestOptions = {}): IUiRequestOptions {
  return { ...options, headers: { ...sessionHeaders(), ...options.headers } }
}

export function asRole(role: ISessionOverrides['role']): IUiRequestOptions {
  return { headers: sessionHeaders({ role }) }
}

export async function createSignedInHarness(
  controllers: IConstructor<unknown>[],
): Promise<ISignedInHarness> {
  if (!Array.isArray(controllers) || controllers.length === 0) {
    throw new Error('createSignedInHarness requires at least one controller')
  }
  const anonymous = await createUiHarness({ controllers, register: SESSION_REGISTRATIONS })
  return {
    anonymous,
    get: (path, options) => anonymous.get(path, withSession(options)),
    action: (path, body, options) => anonymous.action(path, body, withSession(options)),
    close: () => anonymous.close(),
  }
}
