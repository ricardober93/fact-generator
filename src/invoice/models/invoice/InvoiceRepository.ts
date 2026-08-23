import { CrudRepository, CustomError, Locker, query, repository } from '@wabot-dev/framework'
import { isDocType, type IDocType } from '../docType'
import { NumberRangeRepository, type IAssignRejection } from '../../../numbering/app'
import { assertDataSatisfiesTemplate } from '../requiredData'
import { TemplateRepository } from '../template/TemplateRepository'
import { checkArithmetic, type IArithmeticIssue } from './checkArithmetic'
import { Invoice, type ICorrectedDocument, type IInvoiceRecord } from './Invoice'

export interface IInvoiceInput {
  templateId: string
  data: IInvoiceRecord
  items: IInvoiceRecord[]
  params?: Record<string, string>
  docType?: IDocType
  corrects?: ICorrectedDocument
  correctionReason?: string
}

export type ISaveInvoiceResult =
  | { status: 'saved'; invoice: Invoice }
  | { status: 'conflict'; invoice: Invoice }

export type IIssueRejection =
  | IAssignRejection
  | 'ARITHMETIC_MISMATCH'
  | 'MISSING_REASON'
  | 'CORRECTED_NOT_FOUND'
  | 'CORRECTED_NOT_ISSUED'

export type IIssueInvoiceResult =
  | { status: 'issued'; invoice: Invoice }
  | { status: 'rejected'; reason: IIssueRejection; issues: IArithmeticIssue[] }

export interface IIssueInvoiceInput {
  number?: number
  prefix?: string
  at?: number
}

function rejected(reason: IIssueRejection, issues: IArithmeticIssue[] = []): IIssueInvoiceResult {
  return { status: 'rejected', reason, issues }
}

function unknownTemplate(templateId: string): CustomError {
  return new CustomError({
    message: `Unknown template "${templateId}"`,
    humanMessage: 'Esa plantilla no existe.',
    code: 'TEMPLATE_NOT_FOUND',
    httpCode: 404,
  })
}

function alreadyIssued(): CustomError {
  return new CustomError({
    message: 'An issued document cannot be written again',
    humanMessage: 'Una factura emitida ya no se puede modificar.',
    code: 'INVOICE_ALREADY_ISSUED',
    httpCode: 409,
  })
}

function notIssued(): CustomError {
  return new CustomError({
    message: 'Only an issued document can be corrected',
    humanMessage: 'Solo se puede corregir una factura ya emitida.',
    code: 'INVOICE_NOT_ISSUED',
    httpCode: 409,
  })
}

function notFound(): CustomError {
  return new CustomError({
    message: 'Invoice not found',
    humanMessage: 'Esa factura no existe.',
    code: 'INVOICE_NOT_FOUND',
    httpCode: 404,
  })
}

@repository({ table: 'invoice', constructor: Invoice })
export class InvoiceRepository extends CrudRepository<Invoice> {
  constructor(
    private readonly templates: TemplateRepository,
    private readonly ranges: NumberRangeRepository,
    private readonly locker: Locker,
  ) {
    super()
  }

  declare findAll: () => Promise<Invoice[]>

  @query() declare findByDocTypeAndPrefixAndNumber: (
    docType: IDocType,
    prefix: string,
    number: number,
  ) => Promise<Invoice[]>

  async createInvoice(input: IInvoiceInput): Promise<Invoice> {
    const checked = await this.checked(input)
    const docType = isDocType(input.docType) ? input.docType : 'factura'
    const invoice = new Invoice({ ...checked, rev: 1, docType, corrects: input.corrects })
    await this.create(invoice)
    return invoice
  }

  async saveInvoice(
    id: string,
    input: IInvoiceInput,
    expectedRev: number,
  ): Promise<ISaveInvoiceResult> {
    if (typeof id !== 'string' || id.length === 0) {
      throw new CustomError({ message: 'Invoice id is required', httpCode: 400 })
    }
    if (!Number.isFinite(expectedRev)) {
      throw new CustomError({ message: 'Invoice revision is required', httpCode: 400 })
    }
    const checked = await this.checked(input)
    return this.locker.withKey(`invoice:${id}`).run(async () => {
      const invoice = await this.find(id)
      if (!invoice) throw notFound()
      if (invoice.issued) throw alreadyIssued()
      if (invoice.rev !== expectedRev) return { status: 'conflict', invoice }
      invoice.applyRevision(checked)
      await this.update(invoice)
      return { status: 'saved', invoice }
    })
  }

  async issueInvoice(id: string, input: IIssueInvoiceInput = {}): Promise<IIssueInvoiceResult> {
    if (typeof id !== 'string' || id.length === 0) {
      throw new CustomError({ message: 'Invoice id is required', httpCode: 400 })
    }
    const at = Number.isFinite(input.at) ? (input.at as number) : Date.now()
    return this.locker.withKey(`invoice:${id}`).run(async () => {
      const invoice = await this.find(id)
      if (!invoice) throw notFound()
      if (invoice.issued) return { status: 'issued', invoice }
      const issues = checkArithmetic(invoice.invoiceData, invoice.invoiceItems)
      if (issues.length > 0) return rejected('ARITHMETIC_MISMATCH', issues)
      const correction = await this.checkCorrection(invoice)
      if (correction) return rejected(correction)
      const assigned = await this.ranges.assign({
        series: invoice.docType,
        at,
        prefix: input.prefix,
        number: input.number,
        isTaken: (prefix, number) => this.isTaken(invoice.docType, prefix, number),
      })
      if (assigned.status === 'rejected') return rejected(assigned.reason)
      invoice.applyIssue({ prefix: assigned.prefix, number: assigned.number, issuedAt: at })
      await this.update(invoice)
      return { status: 'issued', invoice }
    })
  }

  private async checkCorrection(invoice: Invoice): Promise<IIssueRejection | null> {
    if (invoice.docType !== 'notaCredito') return null
    if (invoice.correctionReason.trim().length === 0) return 'MISSING_REASON'
    const corrected = invoice.corrects
    if (!corrected) return 'CORRECTED_NOT_FOUND'
    const target = await this.find(corrected.id)
    if (!target) return 'CORRECTED_NOT_FOUND'
    return target.issued ? null : 'CORRECTED_NOT_ISSUED'
  }

  async createCreditNoteFor(invoiceId: string): Promise<Invoice> {
    const target = await this.find(invoiceId)
    if (!target) throw notFound()
    if (!target.issued || target.number === null) throw notIssued()
    return this.createInvoice({
      templateId: target.templateId,
      data: target.invoiceData,
      items: target.invoiceItems,
      params: target.params,
      docType: 'notaCredito',
      corrects: { id: target.id, prefix: target.prefix, number: target.number },
    })
  }

  async deleteDraft(invoice: Invoice): Promise<void> {
    if (!invoice) throw notFound()
    if (invoice.issued) throw alreadyIssued()
    await this.delete(invoice)
  }

  private async isTaken(docType: IDocType, prefix: string, number: number): Promise<boolean> {
    const sharing = await this.findByDocTypeAndPrefixAndNumber(docType, prefix, number)
    return sharing.length > 0
  }

  private async checked(input: IInvoiceInput): Promise<{
    templateId: string
    data: IInvoiceRecord
    items: IInvoiceRecord[]
    params: Record<string, string>
    correctionReason?: string
  }> {
    if (!input || typeof input.templateId !== 'string' || input.templateId.length === 0) {
      throw new CustomError({ message: 'Template id is required', httpCode: 400 })
    }
    if (!Array.isArray(input.items)) {
      throw new CustomError({ message: 'Items must be an array', httpCode: 400 })
    }
    const template = await this.templates.find(input.templateId)
    if (!template) throw unknownTemplate(input.templateId)
    const data = input.data ?? {}
    assertDataSatisfiesTemplate(template.doc, data, input.items)
    return {
      templateId: input.templateId,
      data,
      items: input.items,
      params: input.params ?? {},
      correctionReason: input.correctionReason,
    }
  }
}
