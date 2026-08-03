import {
  container,
  CustomError,
  isNotEmpty,
  isNumber,
  isOptional,
  isPresent,
  isString,
} from '@wabot-dev/framework'
import { action, redirect, uiController, view, type VNode } from '@wabot-dev/framework/ui'
import { RequireSession } from '../auth/RequireSession'
import { SignOutButton } from '../auth/ui/SignOutButton'
import { assetsFor } from './embedAssets'
import { Asset } from './models/asset/Asset'
import { AssetRepository } from './models/asset/AssetRepository'
import { Template } from './models/template/Template'
import { TemplateRepository } from './models/template/TemplateRepository'
import { emptyDocument, type IDocument } from './render/document'
import { findTemplatePreset } from './templates/presets'
import { AppLayout } from './ui/AppLayout'
import Editor from './ui/Editor.island'
import { PresetGallery } from './ui/PresetGallery'
import type { IAssetChoice } from './ui/propertyEditors'
import { versionKey } from './versionKey'

export class CreateTemplateDto {
  @isString()
  @isNotEmpty()
  name!: string

  @isOptional()
  @isString()
  preset?: string
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

function unknownPreset(preset: string): CustomError {
  return new CustomError({
    message: `Unknown template preset "${preset}"`,
    humanMessage: 'Ese diseño de plantilla no existe.',
    code: 'TEMPLATE_PRESET_NOT_FOUND',
    httpCode: 400,
  })
}

function documentForPreset(preset: string | undefined): IDocument {
  if (!preset) return emptyDocument()
  const found = findTemplatePreset(preset)
  if (!found) throw unknownPreset(preset)
  return found.build()
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

export async function revisionOf({ id }: { id: string }): Promise<string> {
  const template = await container.resolve(TemplateRepository).find(id)
  const assets = await container.resolve(AssetRepository).findAll()
  return versionKey({
    doc: template ? template.doc : null,
    rev: template ? template.rev : null,
    assets: assets.map((asset) => asset.id),
  })
}

function assetChoices(assets: Asset[]): IAssetChoice[] {
  return assets.map((asset) => ({
    id: asset.id,
    label: `${asset.mime.replace('image/', '')} · ${Math.ceil(asset.sizeBytes / 1024)} kB`,
  }))
}

function TemplateList({ templates }: { templates: Template[] }): VNode {
  return (
    <main class="container stack-lg">
      <div class="row">
        <h1>Plantillas</h1>
        <span class="wb-toolbar-gap" />
        <SignOutButton />
      </div>

      {templates.length === 0 ? (
        <p class="muted">Todavía no hay plantillas.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Revisión</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => (
              <tr key={template.id}>
                <td>
                  <a href={`/templates/${template.id}`}>{template.name}</a>
                </td>
                <td>
                  <span class="badge mono">rev {template.rev}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form method="post" action="/templates/_action/create" class="stack-sm">
        <label for="template-name">Nombre de la plantilla</label>
        <input id="template-name" name="name" required />

        <PresetGallery />

        <button type="submit">Crear plantilla</button>
      </form>
    </main>
  )
}

@uiController({ path: '/templates', app: true, layout: AppLayout, middlewares: [RequireSession] })
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
    const doc = documentForPreset(input.preset)
    const template = await this.templates.createTemplate(input.name, doc)
    return redirect(`/templates/${template.id}`)
  }

  @action()
  async save(input: SaveTemplateDto): Promise<{ rev: number }> {
    const result = await this.templates.saveDocument(input.id, input.doc, input.rev)
    if (result.status === 'conflict') throw conflict(result.template.rev)
    return { rev: result.template.rev }
  }
}
