import type { ICatalogItem } from './CatalogItem'

export interface ICatalogSource {
  readonly available: boolean
  search(owner: string, text: unknown): Promise<ICatalogItem[]>
  findByRef(owner: string, ref: unknown): Promise<ICatalogItem | null>
}
