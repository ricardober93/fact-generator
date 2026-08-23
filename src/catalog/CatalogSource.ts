import { Env, singleton } from '@wabot-dev/framework'
import { readCatalogItem, readCatalogItems, type ICatalogItem } from './CatalogItem'

const TIMEOUT_MS = 2000

@singleton()
export class CatalogSource {
  private readonly baseUrl: string

  constructor(env: Env) {
    if (!env) throw new Error('CatalogSource requires the environment')
    this.baseUrl = env.requireString('CATALOG_URL', { default: '' }).trim().replace(/\/+$/, '')
  }

  get configured(): boolean {
    return this.baseUrl.length > 0
  }

  async search(text: unknown): Promise<ICatalogItem[]> {
    if (!this.configured) return []
    const query = typeof text === 'string' ? text.trim() : ''
    const url = `${this.baseUrl}/v1/items?q=${encodeURIComponent(query)}`
    return readCatalogItems(await this.read(url))
  }

  async findByRef(ref: unknown): Promise<ICatalogItem | null> {
    if (!this.configured) return null
    if (typeof ref !== 'string' || ref.length === 0) return null
    const url = `${this.baseUrl}/v1/items/${encodeURIComponent(ref)}`
    return readCatalogItem(await this.read(url))
  }

  private async read(url: string): Promise<unknown> {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (!response.ok) return null
      return await response.json()
    } catch {
      return null
    }
  }
}
