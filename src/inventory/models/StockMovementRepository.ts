import { CrudRepository, query, repository } from '@wabot-dev/framework'
import { StockMovement } from './StockMovement'

@repository({ table: 'stockMovement', constructor: StockMovement })
export class StockMovementRepository extends CrudRepository<StockMovement> {
  declare findAll: () => Promise<StockMovement[]>

  @query() declare findByArticleId: (articleId: string) => Promise<StockMovement[]>

  async findForArticle(companyId: string, articleId: string): Promise<StockMovement[]> {
    if (typeof companyId !== 'string' || companyId.length === 0) return []
    if (typeof articleId !== 'string' || articleId.length === 0) return []
    const found = await this.findByArticleId(articleId)
    return found.filter((movement) => movement.companyId === companyId)
  }
}
