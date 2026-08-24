import { singleton } from '@wabot-dev/framework'
import type { ICatalogItem } from './CatalogItem'
import { HttpCatalogSource } from './HttpCatalogSource'
import type { ICatalogSource } from './ICatalogSource'
import { LocalCatalogSource } from './LocalCatalogSource'

@singleton()
export class CatalogSource implements ICatalogSource {
  constructor(
    private readonly external: HttpCatalogSource,
    private readonly local: LocalCatalogSource,
  ) {}

  get available(): boolean {
    return this.chosen.available
  }

  async search(owner: string, text: unknown): Promise<ICatalogItem[]> {
    return this.chosen.search(owner, text)
  }

  async findByRef(owner: string, ref: unknown): Promise<ICatalogItem | null> {
    return this.chosen.findByRef(owner, ref)
  }

  private get chosen(): ICatalogSource {
    return this.external.available ? this.external : this.local
  }
}
