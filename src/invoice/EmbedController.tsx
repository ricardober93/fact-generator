import {
  CustomError,
  EXPRESS_REQ,
  inject,
  isArray,
  isNotEmpty,
  isOptional,
  isPresent,
  isString,
} from '@wabot-dev/framework'
import { action, uiController, view, type VNode } from '@wabot-dev/framework/ui'
import { assetsFor } from './embedAssets'
import { AssetRepository } from './models/asset/AssetRepository'
import type { Handoff, IHandoffRecord } from './models/handoff/Handoff'
import { HandoffRepository } from './models/handoff/HandoffRepository'
import { TemplateRepository } from './models/template/TemplateRepository'
import type { IDocument } from './render/document'
import { MissingDataError, render } from './render/render'
import EmbedFrame from './ui/EmbedFrame.island'

export class PrepareHandoffDto {
  @isString()
  @isNotEmpty()
  templateId!: string

  @isPresent()
  data!: IHandoffRecord

  @isArray()
  items!: IHandoffRecord[]

  @isOptional()
  @isPresent()
  params?: Record<string, string>
}

export class EmbedTokenDto {
  @isString()
  @isNotEmpty()
  token!: string
}

interface IQueryRequest {
  query: Record<string, unknown>
}

function notAvailable(): CustomError {
  return new CustomError({
    message: 'Este enlace de factura ya no está disponible.',
    humanMessage: 'Este enlace de factura ya no está disponible.',
    code: 'EMBED_NOT_AVAILABLE',
    httpCode: 404,
  })
}

function missingDataNotice(paths: string[]): VNode {
  return (
    <main style={{ fontFamily: 'Helvetica, Arial, sans-serif', padding: '24px' }}>
      <h1 style={{ fontSize: '16pt' }}>No se puede pintar la factura</h1>
      <p>Faltan datos obligatorios que la plantilla declara:</p>
      <ul>
        {paths.map((path) => (
          <li key={path}>{path}</li>
        ))}
      </ul>
    </main>
  )
}

function renderInvoice(
  doc: IDocument,
  handoff: Handoff,
  params: Record<string, unknown>,
  assets: Record<string, string>,
): VNode {
  try {
    return render({
      doc,
      data: handoff.invoiceData,
      items: handoff.invoiceItems,
      params,
      assets,
    })
  } catch (error) {
    if (error instanceof MissingDataError) return missingDataNotice(error.paths)
    throw error
  }
}

@uiController('/embed')
export class EmbedController {
  constructor(
    private readonly handoffs: HandoffRepository,
    private readonly templates: TemplateRepository,
    private readonly assets: AssetRepository,
    @inject(EXPRESS_REQ) private readonly request: IQueryRequest,
  ) {}

  @action()
  async prepare(input: PrepareHandoffDto): Promise<{ token: string }> {
    const handoff = await this.handoffs.createHandoff(
      input.templateId,
      input.data,
      input.items,
      input.params ?? {},
    )
    return { token: handoff.token }
  }

  @view({ path: ':token', title: 'Factura' })
  async embed(input: EmbedTokenDto): Promise<VNode> {
    const handoff = await this.handoffs.findValid(input.token, Date.now())
    if (!handoff) throw notAvailable()
    const template = await this.templates.find(handoff.templateId)
    if (!template) throw notAvailable()
    const params = { ...handoff.params, ...this.request.query }
    const assets = await assetsFor(template.doc, this.assets, params)
    return (
      <>
        <EmbedFrame />
        {renderInvoice(template.doc, handoff, params, assets)}
      </>
    )
  }
}
