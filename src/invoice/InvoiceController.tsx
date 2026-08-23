import {
  container,
  CustomError,
  isArray,
  isNotEmpty,
  isNumber,
  isOptional,
  isPresent,
  isString,
} from '@wabot-dev/framework'
import { RequireWriter } from '../auth/RequireRole'
import {
  InvoiceIdDto,
  IssueInvoiceDto,
  NewInvoiceDto,
  SaveInvoiceDto,
  type IIssueInvoiceReply,
  type ISaveInvoiceReply,
} from './InvoiceDtos'
import { versionOfInvoice } from './invoiceVersion'
import {
  action,
  uiMiddleware,
  redirect,
  uiController,
  view,
  type UiRedirect,
  type VNode,
} from '@wabot-dev/framework/ui'
import { RequireSession } from '../auth/RequireSession'
import { assetsFor } from './embedAssets'
import { AssetRepository } from './models/asset/AssetRepository'
import type { Invoice, IInvoiceRecord } from './models/invoice/Invoice'
import type { IArithmeticIssue } from './models/invoice/checkArithmetic'
import { InvoiceRepository } from './models/invoice/InvoiceRepository'
import { Issuance, type IIssueRejection } from './Issuance'
import { Template } from './models/template/Template'
import { TemplateRepository } from './models/template/TemplateRepository'
import { dataFit, templateAccepts, type IDataFit } from './render/dataFit'
import type { IDocument } from './render/document'
import { AppLayout } from './ui/AppLayout'
import InvoiceEditor from './ui/InvoiceEditor.island'
import type { ITemplateChoice } from './ui/InvoiceToolbar'
import { InvoiceList } from './ui/InvoiceList'

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

@uiController({ path: '/invoices', app: true, layout: AppLayout, middlewares: [RequireSession] })
export class InvoiceController {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly issuance: Issuance,
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

  @view({ path: ':id', title: 'Factura', swr: { version: versionOfInvoice } })
  async edit(input: InvoiceIdDto): Promise<VNode> {
    const invoice = await this.invoices.find(input.id)
    if (!invoice) throw notFound()
    const templates = await this.templates.findAll()
    const template = templates.find((candidate) => candidate.id === invoice.templateId)
    if (!template) throw notFound()
    return this.editor(
      invoice,
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
  @uiMiddleware(RequireWriter)
  async save(input: SaveInvoiceDto): Promise<ISaveInvoiceReply> {
    const payload = {
      templateId: input.templateId,
      data: input.data,
      items: input.items,
      params: input.params ?? {},
      correctionReason: input.correctionReason,
    }
    if (!input.id) {
      const created = await this.invoices.createInvoice(payload)
      return await this.reply('saved', created)
    }
    const result = await this.invoices.saveInvoice(input.id, payload, input.rev ?? 0)
    return await this.reply(result.status, result.invoice)
  }

  private async reply(status: 'saved' | 'conflict', invoice: Invoice): Promise<ISaveInvoiceReply> {
    return { status, id: invoice.id, rev: invoice.rev }
  }

  @action()
  @uiMiddleware(RequireWriter)
  async issue(input: IssueInvoiceDto): Promise<IIssueInvoiceReply> {
    const result = await this.issuance.issueInvoice(input.id, {
      prefix: input.prefix,
      number: input.number,
    })
    if (result.status === 'rejected') {
      return { status: 'rejected', reason: result.reason, issues: result.issues }
    }
    return { status: 'issued', numero: result.invoice.numero, rev: result.invoice.rev }
  }

  @action()
  @uiMiddleware(RequireWriter)
  async correct(input: InvoiceIdDto): Promise<UiRedirect> {
    const note = await this.issuance.createCreditNoteFor(input.id)
    return redirect(`/invoices/${note.id}`)
  }

  @action()
  @uiMiddleware(RequireWriter)
  async remove(input: InvoiceIdDto) {
    const invoice = await this.invoices.find(input.id)
    if (!invoice) throw notFound()
    await this.invoices.deleteDraft(invoice)
    return redirect('/invoices')
  }

  private async editor(
    invoice: Invoice | null,
    template: Template,
    data: IInvoiceRecord,
    items: IInvoiceRecord[],
    params: Record<string, string>,
    templates: Template[],
    mismatch: IDataFit,
  ): Promise<VNode> {
    return (
      <InvoiceEditor
        id={invoice ? invoice.id : null}
        rev={invoice ? invoice.rev : 0}
        issued={invoice ? invoice.issued : false}
        numero={invoice ? invoice.numero : ''}
        docType={invoice ? invoice.docType : 'factura'}
        correctionReason={invoice ? invoice.correctionReason : ''}
        corrects={invoice ? invoice.corrects : null}
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
