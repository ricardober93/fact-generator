import { CrudRepository, CustomError, query, repository } from '@wabot-dev/framework'
import { Article, type IArticleInput } from './Article'

function invalid(message: string, humanMessage: string): CustomError {
  return new CustomError({
    message,
    humanMessage,
    code: 'INVALID_ARTICLE',
    httpCode: 400,
  })
}

function assertInput(input: IArticleInput): void {
  if (!input || typeof input.companyId !== 'string' || input.companyId.length === 0) {
    throw invalid('An article must belong to a company', 'El artículo tiene que tener empresa.')
  }
  if (typeof input.code !== 'string' || input.code.trim().length === 0) {
    throw invalid('An article must declare its code', 'El artículo necesita un código.')
  }
  if (typeof input.name !== 'string' || input.name.trim().length === 0) {
    throw invalid('An article must declare its name', 'El artículo necesita un nombre.')
  }
  if (!Number.isFinite(input.unitPrice) || input.unitPrice < 0) {
    throw invalid('Unit price must not be negative', 'El precio no puede ser negativo.')
  }
  if (!Number.isFinite(input.taxRate) || input.taxRate < 0) {
    throw invalid('Tax rate must not be negative', 'El impuesto no puede ser negativo.')
  }
}

function notFound(): CustomError {
  return new CustomError({
    message: 'Article not found',
    humanMessage: 'Ese artículo no existe.',
    code: 'ARTICLE_NOT_FOUND',
    httpCode: 404,
  })
}

@repository({ table: 'article', constructor: Article })
export class ArticleRepository extends CrudRepository<Article> {
  declare findAll: () => Promise<Article[]>

  @query() declare findByCompanyId: (companyId: string) => Promise<Article[]>

  async createArticle(input: IArticleInput): Promise<Article> {
    assertInput(input)
    const article = new Article({ ...input, stock: 0, rev: 1 })
    await this.create(article)
    return article
  }

  async findAllFor(companyId: string): Promise<Article[]> {
    if (typeof companyId !== 'string' || companyId.length === 0) return []
    return this.findByCompanyId(companyId)
  }

  async findFor(companyId: string, id: string): Promise<Article | null> {
    if (typeof companyId !== 'string' || companyId.length === 0) return null
    if (typeof id !== 'string' || id.length === 0) return null
    const found = await this.find(id)
    if (!found || found.companyId !== companyId) return null
    return found
  }

  async search(companyId: string, text: unknown): Promise<Article[]> {
    const needle = typeof text === 'string' ? text : ''
    const all = await this.findAllFor(companyId)
    return all.filter((article) => article.matches(needle))
  }

  async saveArticle(companyId: string, id: string, input: IArticleInput): Promise<Article> {
    assertInput({ ...input, companyId })
    const article = await this.findFor(companyId, id)
    if (!article) throw notFound()
    article.applyChanges({ ...input, companyId })
    await this.update(article)
    return article
  }

  async deleteArticle(companyId: string, id: string): Promise<void> {
    const article = await this.findFor(companyId, id)
    if (!article) throw notFound()
    await this.delete(article)
  }
}
