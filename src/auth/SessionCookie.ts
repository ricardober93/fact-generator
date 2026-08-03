import {
  Cookies,
  Env,
  injectable,
  JwtConfig,
  JwtSigner,
  type ICookieOptions,
} from '@wabot-dev/framework'
import type { ISession } from './session'

const MILLISECONDS_PER_SECOND = 1000

@injectable()
export class SessionCookie {
  constructor(
    private readonly cookies: Cookies,
    private readonly config: JwtConfig,
    private readonly signer: JwtSigner,
    private readonly env: Env,
  ) {}

  async open(session: ISession): Promise<void> {
    if (!session || typeof session.email !== 'string' || session.email.length === 0) {
      throw new Error('SessionCookie requires a session with an email')
    }
    const access = await this.signer.signAccessToken({ email: session.email })
    if (!access.token) throw new Error('The signer returned no access token')
    this.cookies.set(this.config.cookieName, access.token, this.options())
  }

  close(): void {
    this.cookies.clear(this.config.cookieName, { path: '/' })
  }

  private options(): ICookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.env.requireString('AUTH_COOKIE_SECURE', { default: 'false' }) === 'true',
      path: '/',
      maxAge: this.config.accessExpirationSeconds * MILLISECONDS_PER_SECOND,
    }
  }
}
