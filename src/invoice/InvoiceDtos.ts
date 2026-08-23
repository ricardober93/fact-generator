import {
  isArray,
  isNotEmpty,
  isNumber,
  isOptional,
  isPresent,
  isString,
} from '@wabot-dev/framework'
import type { IArithmeticIssue } from './models/invoice/checkArithmetic'
import type { IInvoiceRecord } from './models/invoice/Invoice'
import type { IIssueRejection } from './Issuance'

export class InvoiceIdDto {
  @isString()
  @isNotEmpty()
  id!: string
}

export class SaveInvoiceDto {
  @isOptional()
  @isString()
  id?: string

  @isString()
  @isNotEmpty()
  templateId!: string

  @isPresent()
  data!: IInvoiceRecord

  @isArray()
  items!: IInvoiceRecord[]

  @isOptional()
  @isPresent()
  params?: Record<string, string>

  @isOptional()
  @isNumber()
  rev?: number

  @isOptional()
  @isString()
  correctionReason?: string
}

export interface ISaveInvoiceReply {
  status: 'saved' | 'conflict'
  id: string
  rev: number
}

export class IssueInvoiceDto {
  @isString()
  @isNotEmpty()
  id!: string

  @isOptional()
  @isString()
  prefix?: string

  @isOptional()
  @isNumber()
  number?: number
}

export type IIssueInvoiceReply =
  | { status: 'issued'; numero: string; rev: number }
  | { status: 'rejected'; reason: IIssueRejection; issues: IArithmeticIssue[] }

export class NewInvoiceDto {
  @isOptional()
  @isString()
  templateId?: string
}
