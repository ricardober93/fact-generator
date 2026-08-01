import { CrudRepository, CustomError, query, Random, repository } from '@wabot-dev/framework'
import { missingRequiredPaths } from '../../render/bind'
import { DETAIL_ITEM_ROOT, type IDocument } from '../../render/document'
import { TemplateRepository } from '../template/TemplateRepository'
import { Handoff, HANDOFF_TTL_MS, type IHandoffRecord } from './Handoff'

const TOKEN_LENGTH = 32

@repository({ table: 'handoff', constructor: Handoff })
export class HandoffRepository extends CrudRepository<Handoff> {
  constructor(private readonly templates: TemplateRepository) {
    super()
  }

  @query() declare findOneByToken: (token: string) => Promise<Handoff | null>

  @query() declare deleteByExpiresAtLte: (expiresAt: number) => Promise<void>

  async createHandoff(
    templateId: string,
    data: IHandoffRecord,
    items: IHandoffRecord[],
    params: Record<string, string> = {},
  ): Promise<Handoff> {
    if (typeof templateId !== 'string' || templateId.length === 0) {
      throw new CustomError({ message: 'Template id is required', httpCode: 400 })
    }
    if (!Array.isArray(items)) {
      throw new CustomError({ message: 'Items must be an array', httpCode: 400 })
    }
    const template = await this.templates.find(templateId)
    if (!template) {
      throw new CustomError({
        message: `Unknown template "${templateId}"`,
        humanMessage: 'Esa plantilla no existe.',
        code: 'TEMPLATE_NOT_FOUND',
        httpCode: 404,
      })
    }
    assertDataSatisfiesTemplate(template.doc, data, items)
    const handoff = new Handoff({
      token: Random.alphaNumeric(TOKEN_LENGTH),
      templateId,
      data: data ?? {},
      items,
      params: params ?? {},
      expiresAt: Date.now() + HANDOFF_TTL_MS,
    })
    await this.create(handoff)
    return handoff
  }

  async findValid(token: string, now: number): Promise<Handoff | null> {
    if (typeof token !== 'string' || token.length === 0) return null
    const handoff = await this.findOneByToken(token)
    if (!handoff || handoff.isExpired(now)) return null
    return handoff
  }

  async deleteExpired(now: number): Promise<void> {
    if (typeof now !== 'number' || !Number.isFinite(now)) {
      throw new CustomError({ message: 'A finite instant is required', httpCode: 400 })
    }
    await this.deleteByExpiresAtLte(now)
  }
}

function assertDataSatisfiesTemplate(
  doc: IDocument,
  data: IHandoffRecord,
  items: IHandoffRecord[],
): void {
  const missing = missingRequiredPaths(doc, data ?? {}, items, DETAIL_ITEM_ROOT)
  if (missing.length === 0) return
  throw new CustomError({
    message: `Missing required data: ${missing.join(', ')}`,
    humanMessage: `Faltan datos obligatorios: ${missing.join(', ')}`,
    code: 'MISSING_REQUIRED_DATA',
    httpCode: 400,
    info: { paths: missing },
  })
}
