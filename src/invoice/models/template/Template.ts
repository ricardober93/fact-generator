import { Entity, type IEntityData } from '@wabot-dev/framework'
import { withBlockDefaults } from '../../render/blocks/registry'
import type { IDocument } from '../../render/document'

export interface ITemplateData extends IEntityData {
  companyId?: string
  name: string
  doc: IDocument
  rev: number
}

export class Template extends Entity<ITemplateData> {
  get companyId(): string {
    return this.data.companyId ?? ''
  }

  get name(): string {
    return this.data.name
  }

  get rev(): number {
    return this.data.rev
  }

  get doc(): IDocument {
    return withBlockDefaults(this.data.doc as IDocument)
  }

  applyRevision(doc: IDocument): void {
    this.update({ doc, rev: this.data.rev + 1 })
  }
}
