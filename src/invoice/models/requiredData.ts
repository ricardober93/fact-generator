import { CustomError } from '@wabot-dev/framework'
import { missingRequiredPaths } from '../render/bind'
import { DETAIL_ITEM_ROOT, type IDocument } from '../render/document'

export function assertDataSatisfiesTemplate(
  doc: IDocument,
  data: Record<string, unknown>,
  items: unknown[],
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
