import { Auth, CustomError, injectable, Locker } from '@wabot-dev/framework'
import type { ISession } from '../auth/session'
import { CompanyRepository } from '../company/app'
import { NumberRangeRepository, type IAssignRejection } from '../numbering/app'
import type { IDocType } from './models/docType'
import { checkArithmetic, type IArithmeticIssue } from './models/invoice/checkArithmetic'
import type { Invoice } from './models/invoice/Invoice'
import { InvoiceRepository, notFound, notIssued } from './models/invoice/InvoiceRepository'

export type IIssueRejection =
  | IAssignRejection
  | 'ARITHMETIC_MISMATCH'
  | 'MISSING_REASON'
  | 'CORRECTED_NOT_FOUND'
  | 'CORRECTED_NOT_ISSUED'
  | 'NO_COMPANY'

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

@injectable()
export class Issuance {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly companies: CompanyRepository,
    private readonly ranges: NumberRangeRepository,
    private readonly locker: Locker,
    private readonly auth: Auth<ISession>,
  ) {}

  async issueInvoice(id: string, input: IIssueInvoiceInput = {}): Promise<IIssueInvoiceResult> {
    if (typeof id !== 'string' || id.length === 0) {
      throw new CustomError({ message: 'Invoice id is required', httpCode: 400 })
    }
    const at = Number.isFinite(input.at) ? (input.at as number) : Date.now()
    return this.locker.withKey(`invoice:${id}`).run(async () => {
      const invoice = await this.invoices.find(id)
      if (!invoice) throw notFound()
      if (invoice.issued) return { status: 'issued', invoice }
      const issues = checkArithmetic(invoice.invoiceData, invoice.invoiceItems)
      if (issues.length > 0) return rejected('ARITHMETIC_MISMATCH', issues)
      const correction = await this.checkCorrection(invoice)
      if (correction) return rejected(correction)
      return this.assign(invoice, { ...input, at })
    })
  }

  async createCreditNoteFor(invoiceId: string): Promise<Invoice> {
    const target = await this.invoices.find(invoiceId)
    if (!target) throw notFound()
    if (!target.issued || target.number === null) throw notIssued()
    return this.invoices.createInvoice({
      templateId: target.templateId,
      data: target.invoiceData,
      items: target.invoiceItems,
      params: target.params,
      docType: 'notaCredito',
      companyId: target.companyId,
      corrects: { id: target.id, prefix: target.prefix, number: target.number },
    })
  }

  private async assign(
    invoice: Invoice,
    input: IIssueInvoiceInput & { at: number },
  ): Promise<IIssueInvoiceResult> {
    const company = invoice.companyId ? await this.companies.find(invoice.companyId) : null
    if (!company) return rejected('NO_COMPANY')
    const assigned = await this.ranges.assign({
      owner: company.id,
      series: invoice.docType,
      at: input.at,
      prefix: input.prefix,
      number: input.number,
      isTaken: (prefix, number) => this.isTaken(invoice.docType, prefix, number),
    })
    if (assigned.status === 'rejected') return rejected(assigned.reason)
    invoice.applyIssue({
      prefix: assigned.prefix,
      number: assigned.number,
      issuedAt: input.at,
      issuer: company.issuerFields,
      issuedBy: this.who(),
    })
    await this.invoices.update(invoice)
    return { status: 'issued', invoice }
  }

  private who(): { userId: string; name: string } {
    if (!this.auth.isAssigned()) return { userId: '', name: '' }
    const session = this.auth.require()
    return { userId: session.userId, name: session.email }
  }

  private async checkCorrection(invoice: Invoice): Promise<IIssueRejection | null> {
    if (invoice.docType !== 'notaCredito') return null
    if (invoice.correctionReason.trim().length === 0) return 'MISSING_REASON'
    const corrected = invoice.corrects
    if (!corrected) return 'CORRECTED_NOT_FOUND'
    const target = await this.invoices.find(corrected.id)
    if (!target) return 'CORRECTED_NOT_FOUND'
    return target.issued ? null : 'CORRECTED_NOT_ISSUED'
  }

  private async isTaken(docType: IDocType, prefix: string, number: number): Promise<boolean> {
    const sharing = await this.invoices.findByDocTypeAndPrefixAndNumber(docType, prefix, number)
    return sharing.length > 0
  }
}
