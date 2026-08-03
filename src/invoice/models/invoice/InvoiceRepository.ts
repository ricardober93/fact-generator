import { CrudRepository, CustomError, Locker, repository } from '@wabot-dev/framework'
import { assertDataSatisfiesTemplate } from '../requiredData'
import { TemplateRepository } from '../template/TemplateRepository'
import { Invoice, type IInvoiceRecord } from './Invoice'

export interface IInvoiceInput {
  templateId: string
  data: IInvoiceRecord
  items: IInvoiceRecord[]
  params?: Record<string, string>
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
    private readonly locker: Locker,
  ) {
    super()
  }

  declare findAll: () => Promise<Invoice[]>

  async createInvoice(input: IInvoiceInput): Promise<Invoice> {
    const checked = await this.checked(input)
    const invoice = new Invoice({ ...checked, rev: 1 })
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
      if (invoice.rev !== expectedRev) return { status: 'conflict', invoice }
      invoice.applyRevision(checked)
      await this.update(invoice)
      return { status: 'saved', invoice }
    })
  }

  async findByNumero(numero: string): Promise<Invoice[]> {
    if (typeof numero !== 'string' || numero.length === 0) return []
    const all = await this.findAll()
    return all.filter((invoice) => invoice.numero === numero)
  }

  private async checked(input: IInvoiceInput): Promise<{
    templateId: string
    data: IInvoiceRecord
    items: IInvoiceRecord[]
    params: Record<string, string>
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
    }
  }
}
