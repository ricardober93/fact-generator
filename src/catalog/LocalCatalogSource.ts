import { singleton } from '@wabot-dev/framework'
import { ArticleRepository, type Article } from '../inventory/app'
import type { ICatalogItem } from './CatalogItem'
import type { ICatalogSource } from './ICatalogSource'

function toItem(article: Article): ICatalogItem {
  return {
    ref: article.id,
    code: article.code,
    label: article.name,
    unitPrice: article.unitPrice,
    taxRate: article.taxRate,
  }
}

@singleton()
export class LocalCatalogSource implements ICatalogSource {
  constructor(private readonly articles: ArticleRepository) {}

  get available(): boolean {
    return true
  }

  async search(owner: string, text: unknown): Promise<ICatalogItem[]> {
    const found = await this.articles.search(owner, text)
    return found.map(toItem)
  }

  async findByRef(owner: string, ref: unknown): Promise<ICatalogItem | null> {
    if (typeof ref !== 'string' || ref.length === 0) return null
    const article = await this.articles.findFor(owner, ref)
    return article ? toItem(article) : null
  }
}
