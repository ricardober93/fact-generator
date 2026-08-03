import {
  Container,
  isOptional,
  isString,
  JwtGuardMiddleware,
  EXPRESS_REQ,
  EXPRESS_RES,
  inject,
} from '@wabot-dev/framework'
import {
  action,
  redirect,
  uiController,
  view,
  type UiRedirect,
  type VNode,
} from '@wabot-dev/framework/ui'
import type { Request, Response } from 'express'
import { WABOT_DESIGN_CSS } from '../design/wabotDesignCss'
import { AuthCredentials } from './AuthCredentials'
import { localPathOr } from './localPath'
import { LoginAttempts } from './LoginAttempts'
import { SessionCookie } from './SessionCookie'
import { LOGIN_CSS, LoginPage } from './ui/LoginPage'

const DEFAULT_TARGET = '/invoices'
const UNKNOWN_ORIGIN = 'unknown'

const BAD_CREDENTIALS_CODE = 'credenciales'
const BLOCKED_CODE = 'bloqueado'

const MESSAGES: Record<string, string> = {
  [BAD_CREDENTIALS_CODE]: 'No hemos podido entrar con esos datos.',
  [BLOCKED_CODE]: 'Demasiados intentos fallidos. Espera un minuto y vuelve a probar.',
}

export class LoginViewDto {
  @isOptional()
  @isString()
  next?: string

  @isOptional()
  @isString()
  error?: string
}

export class SignInDto {
  @isOptional()
  @isString()
  email?: string

  @isOptional()
  @isString()
  password?: string

  @isOptional()
  @isString()
  next?: string
}

function loginDocument(next: string, error: string): VNode {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: [WABOT_DESIGN_CSS, LOGIN_CSS].join('\n') }} />
      <LoginPage next={next} error={error} />
    </>
  )
}

@uiController('/login')
export class AuthController {
  constructor(
    private readonly credentials: AuthCredentials,
    private readonly attempts: LoginAttempts,
    private readonly session: SessionCookie,
    private readonly guard: JwtGuardMiddleware,
    private readonly container: Container,
    @inject(EXPRESS_REQ) private readonly request: Request,
    @inject(EXPRESS_RES) private readonly response: Response,
  ) {}

  @view({ title: 'Entrar' })
  async login(input: LoginViewDto): Promise<VNode | UiRedirect> {
    const target = localPathOr(input.next, DEFAULT_TARGET)
    if (await this.hasSession()) return redirect(target)
    return loginDocument(target, MESSAGES[input.error ?? ''] ?? '')
  }

  @action()
  async signIn(input: SignInDto): Promise<UiRedirect> {
    const target = localPathOr(input.next, DEFAULT_TARGET)
    const origin = this.origin()
    if (this.attempts.isBlocked(origin, Date.now())) {
      return redirect(this.loginAgain(target, BLOCKED_CODE))
    }
    if (!this.credentials.matches(input.email, input.password)) {
      this.attempts.registerFailure(origin, Date.now())
      return redirect(this.loginAgain(target, BAD_CREDENTIALS_CODE))
    }
    this.attempts.registerSuccess(origin)
    await this.session.open({ email: this.credentials.email })
    return redirect(target)
  }

  private loginAgain(target: string, error: string): string {
    const query = new URLSearchParams({ next: target, error })
    return `/login?${query.toString()}`
  }

  @action()
  signOut(): UiRedirect {
    this.session.close()
    return redirect('/login')
  }

  private origin(): string {
    return this.request?.ip ?? UNKNOWN_ORIGIN
  }

  private async hasSession(): Promise<boolean> {
    try {
      await this.guard.handle(this.request, this.response, this.container)
      return true
    } catch {
      return false
    }
  }
}
