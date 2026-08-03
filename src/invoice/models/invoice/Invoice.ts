import { Entity, type IEntityData } from '@wabot-dev/framework'
import { MISSING, resolvePath } from '../../render/bind'
import {
  INVOICE_CUSTOMER_PATH,
  INVOICE_DATE_PATH,
  INVOICE_NUMBER_PATH,
  INVOICE_TOTAL_PATH,
} from '../../render/invoiceFields'

export type IInvoiceValue =
  | string
  | number
  | boolean
  | null
  | IInvoiceValue[]
  | { [key: string]: IInvoiceValue }

export type IInvoiceRecord = { [key: string]: IInvoiceValue }

export interface IInvoiceSummary {
  numero: string
  cliente: string
  total: string
  fecha: string
}

export interface IInvoiceData extends IEntityData {
  templateId: string
  data: IInvoiceRecord
  items: IInvoiceRecord[]
  params: Record<string, string>
  rev?: number
}

export class Invoice extends Entity<IInvoiceData> {
  get templateId(): string {
    return this.data.templateId
  }

  get rev(): number {
    return this.data.rev ?? 0
  }

  get invoiceData(): IInvoiceRecord {
    return this.data.data
  }

  get invoiceItems(): IInvoiceRecord[] {
    return this.data.items
  }

  get params(): Record<string, string> {
    return this.data.params
  }

  get numero(): string {
    return this.readPath(INVOICE_NUMBER_PATH)
  }

  get summary(): IInvoiceSummary {
    return {
      numero: this.readPath(INVOICE_NUMBER_PATH),
      cliente: this.readPath(INVOICE_CUSTOMER_PATH),
      total: this.readPath(INVOICE_TOTAL_PATH),
      fecha: this.readPath(INVOICE_DATE_PATH),
    }
  }

  applyChanges(input: Omit<IInvoiceData, keyof IEntityData>): void {
    this.update({
      templateId: input.templateId,
      data: input.data,
      items: input.items,
      params: input.params,
    })
  }

  applyRevision(input: Omit<IInvoiceData, keyof IEntityData>): void {
    this.applyChanges(input)
    this.update({ rev: this.rev + 1 })
  }

  private readPath(path: string): string {
    const value = resolvePath(this.data.data, path)
    return value === MISSING ? '' : String(value)
  }
}
