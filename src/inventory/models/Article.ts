import { Entity, type IEntityData } from '@wabot-dev/framework'

export interface IArticleData extends IEntityData {
  companyId: string
  code: string
  name: string
  unitPrice: number
  taxRate: number
  stock?: number
  rev?: number
}

export type IArticleInput = Omit<IArticleData, keyof IEntityData | 'stock' | 'rev'>

export class Article extends Entity<IArticleData> {
  get companyId(): string {
    return this.data.companyId
  }

  get code(): string {
    return this.data.code
  }

  get name(): string {
    return this.data.name
  }

  get unitPrice(): number {
    return this.data.unitPrice
  }

  get taxRate(): number {
    return this.data.taxRate
  }

  get stock(): number {
    return this.data.stock ?? 0
  }

  get rev(): number {
    return this.data.rev ?? 0
  }

  matches(text: string): boolean {
    const needle = text.trim().toLowerCase()
    if (needle.length === 0) return true
    return (
      this.data.code.toLowerCase().includes(needle) || this.data.name.toLowerCase().includes(needle)
    )
  }

  applyChanges(input: IArticleInput): void {
    this.update({
      code: input.code,
      name: input.name,
      unitPrice: input.unitPrice,
      taxRate: input.taxRate,
      rev: this.rev + 1,
    })
  }

  applyStockChange(delta: number): void {
    this.update({ stock: this.stock + delta, rev: this.rev + 1 })
  }
}
