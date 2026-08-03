import { singleton } from '@wabot-dev/framework'

export const MAX_FAILED_ATTEMPTS = 5
export const BLOCK_WINDOW_MS = 60_000

interface IAttempts {
  failures: number
  blockedUntil: number
}

@singleton()
export class LoginAttempts {
  private readonly byOrigin = new Map<string, IAttempts>()

  isBlocked(origin: unknown, now: unknown): boolean {
    if (typeof origin !== 'string' || typeof now !== 'number') return false
    const attempts = this.byOrigin.get(origin)
    if (!attempts) return false
    return now < attempts.blockedUntil
  }

  registerFailure(origin: unknown, now: unknown): void {
    if (typeof origin !== 'string' || typeof now !== 'number') return
    const attempts = this.byOrigin.get(origin) ?? { failures: 0, blockedUntil: 0 }
    const failures = attempts.failures + 1
    const blocked = failures >= MAX_FAILED_ATTEMPTS
    this.byOrigin.set(origin, {
      failures: blocked ? 0 : failures,
      blockedUntil: blocked ? now + BLOCK_WINDOW_MS : attempts.blockedUntil,
    })
  }

  registerSuccess(origin: unknown): void {
    if (typeof origin !== 'string') return
    this.byOrigin.delete(origin)
  }
}
