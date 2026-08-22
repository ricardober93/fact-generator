import { Entity, type IEntityData } from '@wabot-dev/framework'
import type { IDocType } from '../docType'

export interface INumberRangeData extends IEntityData {
  docType: IDocType
  prefix: string
  from: number
  to: number
  next: number
  validFrom: number
  validTo: number
}

export class NumberRange extends Entity<INumberRangeData> {
  get docType(): IDocType {
    return this.data.docType
  }

  get prefix(): string {
    return this.data.prefix
  }

  get from(): number {
    return this.data.from
  }

  get to(): number {
    return this.data.to
  }

  get next(): number {
    return this.data.next
  }

  get validFrom(): number {
    return this.data.validFrom
  }

  get validTo(): number {
    return this.data.validTo
  }

  get exhausted(): boolean {
    return this.data.next > this.data.to
  }

  isValidAt(at: number): boolean {
    if (!Number.isFinite(at)) return false
    return at >= this.data.validFrom && at <= this.data.validTo
  }

  covers(number: number): boolean {
    if (!Number.isInteger(number)) return false
    return number >= this.data.from && number <= this.data.to
  }

  usableAt(at: number): boolean {
    return this.isValidAt(at) && !this.exhausted
  }

  overlaps(from: number, to: number): boolean {
    return from <= this.data.to && this.data.from <= to
  }

  advancePast(number: number): void {
    if (!Number.isInteger(number)) throw new Error('advancePast requires a whole consecutive')
    if (number < this.data.next) return
    this.update({ next: number + 1 })
  }
}
