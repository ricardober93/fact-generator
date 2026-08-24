import { Auth, CustomError, isNotEmpty, isString } from '@wabot-dev/framework'
import {
  action,
  redirect,
  uiController,
  uiMiddleware,
  view,
  type UiRedirect,
  type VNode,
} from '@wabot-dev/framework/ui'
import { RequireAdmin } from '../auth/RequireRole'
import { RequireSession } from '../auth/RequireSession'
import type { ISession } from '../auth/session'
import { AppLayout } from '../invoice/ui/AppLayout'
import { ArticleRepository } from './models/ArticleRepository'
import { Stock } from './Stock'
import { ArticlePage } from './ui/ArticlePage'

export class CreateArticleDto {
  @isString()
  @isNotEmpty()
  code!: string

  @isString()
  @isNotEmpty()
  name!: string

  @isString()
  @isNotEmpty()
  unitPrice!: string

  @isString()
  @isNotEmpty()
  taxRate!: string
}

export class AdjustStockDto {
  @isString()
  @isNotEmpty()
  id!: string

  @isString()
  @isNotEmpty()
  delta!: string

  @isString()
  @isNotEmpty()
  reason!: string
}

function badInput(humanMessage: string): CustomError {
  return new CustomError({
    message: 'Invalid article input',
    humanMessage,
    code: 'INVALID_ARTICLE_INPUT',
    httpCode: 400,
  })
}

function asAmount(value: string, label: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) throw badInput(`${label} no es válido.`)
  return parsed
}

function asWhole(value: string, label: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) throw badInput(`${label} tiene que ser un entero.`)
  return parsed
}

@uiController({ path: '/articles', app: true, layout: AppLayout, middlewares: [RequireSession] })
export class ArticleController {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly stock: Stock,
    private readonly auth: Auth<ISession>,
  ) {}

  private get companyId(): string {
    return this.auth.require().companyId
  }

  private get canWrite(): boolean {
    return this.auth.require().role === 'administrador'
  }

  @view({ title: 'Catálogo' })
  async index(): Promise<VNode> {
    const stored = await this.articles.findAllFor(this.companyId)
    return <ArticlePage articles={stored} canWrite={this.canWrite} />
  }

  @action()
  @uiMiddleware(RequireAdmin)
  async create(input: CreateArticleDto): Promise<UiRedirect> {
    await this.articles.createArticle({
      companyId: this.companyId,
      code: input.code,
      name: input.name,
      unitPrice: asAmount(input.unitPrice, 'El precio'),
      taxRate: asAmount(input.taxRate, 'El impuesto'),
    })
    return redirect('/articles')
  }

  @action()
  @uiMiddleware(RequireAdmin)
  async adjust(input: AdjustStockDto): Promise<UiRedirect> {
    await this.stock.adjust({
      companyId: this.companyId,
      articleId: input.id,
      delta: asWhole(input.delta, 'El ajuste'),
      reason: input.reason,
    })
    return redirect('/articles')
  }
}
