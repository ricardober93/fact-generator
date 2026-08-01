import { CrudRepository, CustomError, Locker, query, repository } from '@wabot-dev/framework'
import type { IDocument } from '../../render/document'
import { validateDocument } from '../../render/validateDocument'
import { Template } from './Template'

export type ISaveDocumentResult =
  | { status: 'saved'; template: Template }
  | { status: 'conflict'; template: Template }

function assertValidDocument(doc: IDocument): void {
  const issues = validateDocument(doc)
  if (issues.length === 0) return
  throw new CustomError({
    message: `Invalid document: ${issues.length} issue(s)`,
    humanMessage: 'La plantilla tiene errores y no se guardó.',
    code: 'INVALID_DOCUMENT',
    httpCode: 400,
    info: { issues },
  })
}

@repository({ table: 'template', constructor: Template })
export class TemplateRepository extends CrudRepository<Template> {
  constructor(private readonly locker: Locker) {
    super()
  }

  @query() declare findOneByName: (name: string) => Promise<Template | null>

  declare findAll: () => Promise<Template[]>

  async createTemplate(name: string, doc: IDocument): Promise<Template> {
    if (!name) {
      throw new CustomError({ message: 'Template name is required', httpCode: 400 })
    }
    assertValidDocument(doc)
    const template = new Template({ name, doc, rev: 1 })
    await this.create(template)
    return template
  }

  async saveDocument(
    id: string,
    doc: IDocument,
    expectedRev: number,
  ): Promise<ISaveDocumentResult> {
    if (!id) {
      throw new CustomError({ message: 'Template id is required', httpCode: 400 })
    }
    assertValidDocument(doc)
    return this.locker.withKey(`template:${id}`).run(async () => {
      const template = await this.findOrThrow(id)
      if (template.rev !== expectedRev) {
        return { status: 'conflict', template }
      }
      template.applyRevision(doc)
      await this.update(template)
      return { status: 'saved', template }
    })
  }
}
