import { injectable, JwtGuardMiddleware, type IMiddleware } from '@wabot-dev/framework'
import type { Request, Response } from 'express'
import type { DependencyContainer } from 'tsyringe'
import { loginPathFor } from './localPath'

const ACTION_SEGMENT = '/_action/'
const EXPIRED_MESSAGE = 'La sesión ha caducado. Vuelve a entrar para seguir.'

@injectable()
export class RequireSession implements IMiddleware {
  constructor(private readonly guard: JwtGuardMiddleware) {}

  async handle(req: Request, res: Response, container: DependencyContainer): Promise<void> {
    if (!req || !res || !container) {
      throw new Error('RequireSession requires the request context')
    }
    try {
      await this.guard.handle(req, res, container)
    } catch {
      this.reject(req, res)
    }
  }

  private reject(req: Request, res: Response): void {
    const target = req.originalUrl ?? ''
    if (target.includes(ACTION_SEGMENT)) {
      res.status(401).json({ error: { message: EXPIRED_MESSAGE } })
      return
    }
    res.redirect(302, loginPathFor(target))
  }
}
