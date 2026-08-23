import { CrudRepository, CustomError, Locker, query, repository } from '@wabot-dev/framework'
import { isDocType, type IDocType } from '../docType'
import { CompanyRepository } from '../../../company/app'
import { writePath } from '../../../kernel/paths'
import type { IDocument } from '../../render/document'
import { ISSUER_ROOT } from '../../render/invoiceFields'
import { assertDataSatisfiesTemplate, isSystemWritten } from '../requiredData'
import { TemplateRepository } from '../template/TemplateRepository'
import {
  Invoice,
  type ICorrectedDocument,
  type IInvoiceRecord,
  type IInvoiceValue,
} from './Invoice'

export interface IInvoiceInput {
  templateId: string
  data: IInvoiceRecord
  items: IInvoiceRecord[]
  params?: Record<string, string>
  companyId: string
  docType?: IDocType
  corrects?: ICorrectedDocument
  correctionReason?: string
}

export type ISaveInvoiceResult =
  | { status: 'saved'; invoice: Invoice }
  | { status: 'conflict'; invoice: Invoice }

function unknownTemplate(templateId: string): CustomError {
  return new CustomError({
    message: `Unknown template "${templateId}"`,
    humanMessage: 'Esa plantilla no existe.',
    code: 'TEMPLATE_NOT_FOUND',
    httpCode: 404,
  })
}

export function alreadyIssued(): CustomError {
  return new CustomError({
    message: 'An issued document cannot be written again',
    humanMessage: 'Una factura emitida ya no se puede modificar.',
    code: 'INVOICE_ALREADY_ISSUED',
    httpCode: 409,
  })
}

export function notIssued(): CustomError {
  return new CustomError({
    message: 'Only an issued document can be corrected',
    humanMessage: 'Solo se puede corregir una factura ya emitida.',
    code: 'INVOICE_NOT_ISSUED',
    httpCode: 409,
  })
}

export function notFound(): CustomError {
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
    private readonly companies: CompanyRepository,
    private readonly locker: Locker,
  ) {
    super()
  }

  declare findAll: () => Promise<Invoice[]>

  @query() declare findByCompanyId: (companyId: string) => Promise<Invoice[]>

  async findAllFor(companyId: string): Promise<Invoice[]> {
    if (typeof companyId !== 'string' || companyId.length === 0) return []
    return this.findByCompanyId(companyId)
  }

  async findFor(companyId: string, id: string): Promise<Invoice | null> {
    const found = await this.find(id)
    if (!found || found.companyId !== companyId) return null
    return found
  }

  @query() declare findByDocTypeAndPrefixAndNumber: (
    docType: IDocType,
    prefix: string,
    number: number,
  ) => Promise<Invoice[]>

  async createInvoice(input: IInvoiceInput): Promise<Invoice> {
    const checked = await this.checked(input)
    const docType = isDocType(input.docType) ? input.docType : 'factura'
    const invoice = new Invoice({
      ...checked,
      rev: 1,
      docType,
      corrects: input.corrects,
      companyId: input.companyId,
    })
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

  async deleteDraft(invoice: Invoice): Promise<void> {
    if (!invoice) throw notFound()
    if (invoice.issued) throw alreadyIssued()
    await this.delete(invoice)
  }

  private async withIssuer(
    doc: IDocument,
    companyId: string,
    data: IInvoiceRecord,
  ): Promise<IInvoiceRecord> {
    const company = companyId ? await this.companies.find(companyId) : null
    if (!company) return data
    const declared = new Set(doc.dataSchema.map((entry) => entry.path))
    let next = data
    for (const [key, value] of Object.entries(company.issuerFields)) {
      const path = `${ISSUER_ROOT}.${key}`
      if (!declared.has(path)) continue
      next = writePath<IInvoiceValue>(next, path, value)
    }
    return next
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
    const data = await this.withIssuer(template.doc, input.companyId, input.data ?? {})
    assertDataSatisfiesTemplate(template.doc, data, input.items, isSystemWritten)
    return {
      templateId: input.templateId,
      data,
      items: input.items,
      params: input.params ?? {},
      correctionReason: input.correctionReason,
    }
  }
}
