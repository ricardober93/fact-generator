import { Entity, type IEntityData } from '@wabot-dev/framework'

export interface IStockAuthor {
  userId: string
  name: string
}

export interface IStockMovementData extends IEntityData {
  companyId: string
  articleId: string
  delta: number
  reason: string
  at: number
  by: IStockAuthor
}

export class StockMovement extends Entity<IStockMovementData> {
  get companyId(): string {
    return this.data.companyId
  }

  get articleId(): string {
    return this.data.articleId
  }

  get delta(): number {
    return this.data.delta
  }

  get reason(): string {
    return this.data.reason
  }

  get at(): number {
    return this.data.at
  }

  get by(): IStockAuthor {
    return this.data.by
  }
}
