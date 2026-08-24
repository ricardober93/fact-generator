import { Auth, CustomError, injectable, Locker } from '@wabot-dev/framework'
import type { ISession } from '../auth/session'
import { ArticleRepository } from './models/ArticleRepository'
import type { Article } from './models/Article'
import { StockMovement, type IStockAuthor } from './models/StockMovement'
import { StockMovementRepository } from './models/StockMovementRepository'

export interface IAdjustStockInput {
  companyId: string
  articleId: string
  delta: number
  reason: string
  at?: number
}

function invalid(message: string, humanMessage: string): CustomError {
  return new CustomError({
    message,
    humanMessage,
    code: 'INVALID_STOCK_ADJUSTMENT',
    httpCode: 400,
  })
}

function notFound(): CustomError {
  return new CustomError({
    message: 'Article not found',
    humanMessage: 'Ese artículo no existe.',
    code: 'ARTICLE_NOT_FOUND',
    httpCode: 404,
  })
}

function assertInput(input: IAdjustStockInput): void {
  if (!input || typeof input.reason !== 'string' || input.reason.trim().length === 0) {
    throw invalid('A stock adjustment must declare its reason', 'El ajuste necesita un motivo.')
  }
  if (!Number.isFinite(input.delta) || !Number.isInteger(input.delta)) {
    throw invalid('A stock adjustment must be a whole amount', 'El ajuste tiene que ser entero.')
  }
}

@injectable()
export class Stock {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly movements: StockMovementRepository,
    private readonly locker: Locker,
    private readonly auth: Auth<ISession>,
  ) {}

  async adjust(input: IAdjustStockInput): Promise<Article> {
    assertInput(input)
    const at = Number.isFinite(input.at) ? (input.at as number) : Date.now()
    return this.locker.withKey(`article:${input.articleId}`).run(async () => {
      const article = await this.articles.findFor(input.companyId, input.articleId)
      if (!article) throw notFound()
      article.applyStockChange(input.delta)
      await this.articles.update(article)
      await this.movements.create(
        new StockMovement({
          companyId: input.companyId,
          articleId: article.id,
          delta: input.delta,
          reason: input.reason.trim(),
          at,
          by: this.who(),
        }),
      )
      return article
    })
  }

  async movementsOf(companyId: string, articleId: string): Promise<StockMovement[]> {
    return this.movements.findForArticle(companyId, articleId)
  }

  private who(): IStockAuthor {
    if (!this.auth.isAssigned()) return { userId: '', name: '' }
    const session = this.auth.require()
    return { userId: session.userId, name: session.email }
  }
}
