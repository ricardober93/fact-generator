import {
  CustomError,
  isArray,
  isNotEmpty,
  isOptional,
  isPresent,
  isString,
} from '@wabot-dev/framework'
import { action, redirect, uiController, view, type VNode } from '@wabot-dev/framework/ui'
import { assetsFor } from './embedAssets'
import { AssetRepository } from './models/asset/AssetRepository'
import type { Invoice, IInvoiceRecord } from './models/invoice/Invoice'
import { InvoiceRepository } from './models/invoice/InvoiceRepository'
import { Template } from './models/template/Template'
import { TemplateRepository } from './models/template/TemplateRepository'
import { dataFit, templateAccepts, type IDataFit } from './render/dataFit'
import type { IDocument } from './render/document'
import { AppLayout } from './ui/AppLayout'
import InvoiceEditor from './ui/InvoiceEditor.island'
import type { ITemplateChoice } from './ui/InvoiceToolbar'
import { InvoiceList } from './ui/InvoiceList'

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
}

export class NewInvoiceDto {
  @isOptional()
  @isString()
  templateId?: string
}

const NO_MISMATCH: IDataFit = { missing: [], orphan: [] }

function notFound(): CustomError {
  return new CustomError({
    message: 'Invoice not found',
    humanMessage: 'Esa factura no existe.',
    code: 'INVOICE_NOT_FOUND',
    httpCode: 404,
  })
}

function noTemplates(): CustomError {
  return new CustomError({
    message: 'No templates available',
    humanMessage: 'Antes de facturar hace falta al menos una plantilla.',
    code: 'NO_TEMPLATES',
    httpCode: 400,
  })
}

function choicesFor(
  templates: Template[],
  data: IInvoiceRecord,
  items: unknown[],
): ITemplateChoice[] {
  const accepted = templates.filter((template) => templateAccepts(template.doc, data, items))
  const pool = accepted.length > 0 ? accepted : templates
  return pool.map((template): ITemplateChoice => ({ id: template.id, name: template.name }))
}

@uiController({ path: '/invoices', app: true, layout: AppLayout })
export class InvoiceController {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly templates: TemplateRepository,
    private readonly assets: AssetRepository,
  ) {}

  @view({ title: 'Facturas' })
  async index(): Promise<VNode> {
    const stored = await this.invoices.findAll()
    return <InvoiceList invoices={stored} />
  }

  @view({ path: 'new', title: 'Nueva factura' })
  async create(input: NewInvoiceDto): Promise<VNode> {
    const templates = await this.templates.findAll()
    if (templates.length === 0) throw noTemplates()
    const chosen = templates.find((template) => template.id === input.templateId) ?? templates[0]
    return this.editor(null, chosen, {}, [], {}, templates, NO_MISMATCH)
  }

  @view({ path: ':id', title: 'Factura' })
  async edit(input: InvoiceIdDto): Promise<VNode> {
    const invoice = await this.invoices.find(input.id)
    if (!invoice) throw notFound()
    const templates = await this.templates.findAll()
    const template = templates.find((candidate) => candidate.id === invoice.templateId)
    if (!template) throw notFound()
    return this.editor(
      invoice.id,
      template,
      invoice.invoiceData,
      invoice.invoiceItems,
      invoice.params,
      templates,
      dataFit(template.doc, invoice.invoiceData, invoice.invoiceItems),
    )
  }

  @action()
  async document(input: InvoiceIdDto): Promise<{ doc: IDocument; assets: Record<string, string> }> {
    const template = await this.templates.find(input.id)
    if (!template) throw notFound()
    return { doc: template.doc, assets: await assetsFor(template.doc, this.assets) }
  }

  @action()
  async save(input: SaveInvoiceDto): Promise<{ id: string; duplicate: boolean }> {
    const payload = {
      templateId: input.templateId,
      data: input.data,
      items: input.items,
      params: input.params ?? {},
    }
    const invoice = input.id
      ? await this.invoices.saveInvoice(input.id, payload)
      : await this.invoices.createInvoice(payload)
    return { id: invoice.id, duplicate: await this.isDuplicate(invoice) }
  }

  @action()
  async remove(input: InvoiceIdDto) {
    const invoice = await this.invoices.find(input.id)
    if (!invoice) throw notFound()
    await this.invoices.delete(invoice)
    return redirect('/invoices')
  }

  private async isDuplicate(invoice: Invoice): Promise<boolean> {
    if (!invoice.numero) return false
    const sharing = await this.invoices.findByNumero(invoice.numero)
    return sharing.some((other) => other.id !== invoice.id)
  }

  private async editor(
    id: string | null,
    template: Template,
    data: IInvoiceRecord,
    items: IInvoiceRecord[],
    params: Record<string, string>,
    templates: Template[],
    mismatch: IDataFit,
  ): Promise<VNode> {
    return (
      <InvoiceEditor
        id={id}
        templateId={template.id}
        doc={template.doc}
        data={data}
        items={items}
        params={params}
        assets={await assetsFor(template.doc, this.assets)}
        templates={choicesFor(templates, data, items)}
        mismatch={mismatch}
      />
    )
  }
}
