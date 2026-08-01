import { cronHandler, type ICronHandler, Logger } from '@wabot-dev/framework'
import { HandoffRepository } from './HandoffRepository'

const logger = new Logger('invoice:expire-handoffs')

@cronHandler({ name: 'expire-handoffs', cron: '0 3 * * *' })
export class ExpireHandoffs implements ICronHandler {
  constructor(private readonly handoffs: HandoffRepository) {}

  async handle(): Promise<void> {
    await this.handoffs.deleteExpired(Date.now())
  }

  async handleError(error: unknown): Promise<void> {
    logger.error('expire-handoffs failed', error)
  }
}
