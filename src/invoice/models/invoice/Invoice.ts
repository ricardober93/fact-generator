import { Entity, type IEntityData } from '@wabot-dev/framework'
import { MISSING, resolvePath, writePath } from '../../../kernel/paths'
import type { IDocType } from '../docType'
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

export type IInvoiceStatus = 'borrador' | 'emitida'

export interface ICorrectedDocument {
  id: string
  prefix: string
  number: number
}

export interface IIssueStamp {
  prefix: string
  number: number
  issuedAt: number
  issuer: Record<string, string>
  issuedBy: { userId: string; name: string }
}

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
  docType?: IDocType
  status?: IInvoiceStatus
  prefix?: string
  number?: number
  issuedAt?: number
  corrects?: ICorrectedDocument
  correctionReason?: string
  companyId?: string
  issuer?: Record<string, string>
  issuedBy?: { userId: string; name: string }
}

export class Invoice extends Entity<IInvoiceData> {
  get templateId(): string {
    return this.data.templateId
  }

  get rev(): number {
    return this.data.rev ?? 0
  }

  get docType(): IDocType {
    return this.data.docType ?? 'factura'
  }

  get status(): IInvoiceStatus {
    return this.data.status ?? 'borrador'
  }

  get issued(): boolean {
    return this.status === 'emitida'
  }

  get prefix(): string {
    return this.data.prefix ?? ''
  }

  get number(): number | null {
    return this.data.number ?? null
  }

  get issuedAt(): Date | null {
    return this.data.issuedAt === undefined ? null : new Date(this.data.issuedAt)
  }

  get companyId(): string {
    return this.data.companyId ?? ''
  }

  get issuer(): Record<string, string> {
    return this.data.issuer ?? {}
  }

  get issuedBy(): { userId: string; name: string } | null {
    return this.data.issuedBy ?? null
  }

  get corrects(): ICorrectedDocument | null {
    return this.data.corrects ?? null
  }

  get correctionReason(): string {
    return this.data.correctionReason ?? ''
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
    if (this.data.number === undefined) return this.readPath(INVOICE_NUMBER_PATH)
    return `${this.prefix}${this.data.number}`
  }

  get summary(): IInvoiceSummary {
    return {
      numero: this.numero,
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
    if (input.correctionReason !== undefined) {
      this.update({ correctionReason: input.correctionReason })
    }
  }

  applyRevision(input: Omit<IInvoiceData, keyof IEntityData>): void {
    this.applyChanges(input)
    this.update({ rev: this.rev + 1 })
  }

  applyIssue(stamp: IIssueStamp): void {
    if (typeof stamp?.prefix !== 'string' || !Number.isInteger(stamp?.number)) {
      throw new Error('applyIssue requires a prefix and an integer number')
    }
    if (!Number.isFinite(stamp.issuedAt)) {
      throw new Error('applyIssue requires an instant')
    }
    this.update({
      status: 'emitida',
      docType: this.docType,
      issuer: stamp.issuer,
      issuedBy: stamp.issuedBy,
      prefix: stamp.prefix,
      number: stamp.number,
      issuedAt: stamp.issuedAt,
      data: writePath<IInvoiceValue>(
        this.data.data,
        INVOICE_NUMBER_PATH,
        `${stamp.prefix}${stamp.number}`,
      ),
    })
  }

  private readPath(path: string): string {
    const value = resolvePath(this.data.data, path)
    return value === MISSING ? '' : String(value)
  }
}
