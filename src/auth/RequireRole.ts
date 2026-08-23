import { Auth, injectable, type IMiddleware } from '@wabot-dev/framework'
import type { Request, Response } from 'express'
import type { DependencyContainer } from 'tsyringe'
import type { ISession, IUserRole } from './session'

const ACTION_SEGMENT = '/_action/'
const FORBIDDEN_MESSAGE = 'Tu rol no permite hacer esto.'

function reject(req: Request, res: Response): void {
  const target = req.originalUrl ?? ''
  if (target.includes(ACTION_SEGMENT)) {
    res.status(403).json({ error: { message: FORBIDDEN_MESSAGE } })
    return
  }
  res.status(403).send(FORBIDDEN_MESSAGE)
}

async function allow(
  allowed: readonly IUserRole[],
  req: Request,
  res: Response,
  container: DependencyContainer,
): Promise<void> {
  if (!req || !res || !container) throw new Error('RequireRole requires the request context')
  const auth = container.resolve<Auth<ISession>>(Auth)
  const session = auth.isAssigned() ? auth.require() : null
  if (session && allowed.includes(session.role)) return
  reject(req, res)
}

@injectable()
export class RequireAdmin implements IMiddleware {
  async handle(req: Request, res: Response, container: DependencyContainer): Promise<void> {
    await allow(['administrador'], req, res, container)
  }
}

@injectable()
export class RequireWriter implements IMiddleware {
  async handle(req: Request, res: Response, container: DependencyContainer): Promise<void> {
    await allow(['administrador', 'cajero'], req, res, container)
  }
}
