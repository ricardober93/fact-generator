import {
  container,
  CustomError,
  isNotEmpty,
  isNumber,
  isPresent,
  isString,
} from '@wabot-dev/framework'
import { action, redirect, uiController, view, type VNode } from '@wabot-dev/framework/ui'
import { assetsFor } from './embedAssets'
import { Asset } from './models/asset/Asset'
import { AssetRepository } from './models/asset/AssetRepository'
import { Template } from './models/template/Template'
import { TemplateRepository } from './models/template/TemplateRepository'
import { emptyDocument, type IDocument } from './render/document'
import Editor from './ui/Editor.island'
import type { IAssetChoice } from './ui/propertyEditors'

export class CreateTemplateDto {
  @isString()
  @isNotEmpty()
  name!: string
}

export class SaveTemplateDto {
  @isString()
  @isNotEmpty()
  id!: string

  @isPresent()
  doc!: IDocument

  @isNumber()
  rev!: number
}

export class TemplateIdDto {
  @isString()
  @isNotEmpty()
  id!: string
}

function notFound(): CustomError {
  return new CustomError({
    message: 'Esa plantilla no existe.',
    humanMessage: 'Esa plantilla no existe.',
    code: 'TEMPLATE_NOT_FOUND',
    httpCode: 404,
  })
}

function conflict(rev: number): CustomError {
  return new CustomError({
    message: `Template revision is stale, stored revision is ${rev}`,
    humanMessage: 'Otro guardado se adelantó al tuyo.',
    code: 'TEMPLATE_REVISION_CONFLICT',
    httpCode: 409,
    info: { rev },
  })
}

async function revisionOf({ id }: { id: string }): Promise<string> {
  const template = await container.resolve(TemplateRepository).find(id)
  return template ? String(template.rev) : 'missing'
}

function assetChoices(assets: Asset[]): IAssetChoice[] {
  return assets.map((asset) => ({
    id: asset.id,
    label: `${asset.mime.replace('image/', '')} · ${Math.ceil(asset.sizeBytes / 1024)} kB`,
  }))
}

function TemplateList({ templates }: { templates: Template[] }): VNode {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '24px', maxWidth: '640px' }}>
      <h1 style={{ fontSize: '20px' }}>Plantillas</h1>
      <form method="post" action="/templates/_action/create" style={{ margin: '16px 0' }}>
        <input name="name" placeholder="Nombre de la plantilla" required />
        <button type="submit">Crear</button>
      </form>
      <ul>
        {templates.map((template) => (
          <li key={template.id}>
            <a href={`/templates/${template.id}`}>{template.name}</a>
            <span style={{ color: '#666', fontSize: '12px' }}> · rev {template.rev}</span>
          </li>
        ))}
      </ul>
    </main>
  )
}

@uiController({ path: '/templates', app: true })
export class TemplateController {
  constructor(
    private readonly templates: TemplateRepository,
    private readonly assets: AssetRepository,
  ) {}

  @view({ title: 'Plantillas' })
  async index(): Promise<VNode> {
    return <TemplateList templates={await this.templates.findAll()} />
  }

  @view({
    path: ':id',
    title: 'Editor de plantilla',
    swr: { version: revisionOf },
  })
  async edit(input: TemplateIdDto): Promise<VNode> {
    const template = await this.templates.find(input.id)
    if (!template) throw notFound()
    const stored = await this.assets.findAll()
    return (
      <Editor
        id={template.id}
        doc={template.doc}
        rev={template.rev}
        assets={assetChoices(stored)}
        assetUris={await assetsFor(template.doc, this.assets)}
      />
    )
  }

  @action()
  async create(input: CreateTemplateDto) {
    const template = await this.templates.createTemplate(input.name, emptyDocument())
    return redirect(`/templates/${template.id}`)
  }

  @action()
  async save(input: SaveTemplateDto): Promise<{ rev: number }> {
    const result = await this.templates.saveDocument(input.id, input.doc, input.rev)
    if (result.status === 'conflict') throw conflict(result.template.rev)
    return { rev: result.template.rev }
  }
}
