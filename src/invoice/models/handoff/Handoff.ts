import { Entity, type IEntityData } from '@wabot-dev/framework'

export type IHandoffValue =
  | string
  | number
  | boolean
  | null
  | IHandoffValue[]
  | { [key: string]: IHandoffValue }

export type IHandoffRecord = { [key: string]: IHandoffValue }

export const HANDOFF_TTL_MS = 10 * 60 * 1000

export interface IHandoffData extends IEntityData {
  token: string
  templateId: string
  data: IHandoffRecord
  items: IHandoffRecord[]
  params: Record<string, string>
  expiresAt: number
}

export class Handoff extends Entity<IHandoffData> {
  get token(): string {
    return this.data.token
  }

  get templateId(): string {
    return this.data.templateId
  }

  get invoiceData(): IHandoffRecord {
    return this.data.data
  }

  get invoiceItems(): IHandoffRecord[] {
    return this.data.items
  }

  get params(): Record<string, string> {
    return this.data.params
  }

  get expiresAt(): number {
    return this.data.expiresAt
  }

  isExpired(now: number): boolean {
    return now >= this.data.expiresAt
  }
}
