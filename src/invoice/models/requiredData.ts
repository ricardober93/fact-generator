import { CustomError } from '@wabot-dev/framework'
import { missingRequiredPaths } from '../render/bind'
import { DETAIL_ITEM_ROOT, type IDocument } from '../render/document'
import { INVOICE_NUMBER_PATH, ISSUER_ROOT } from '../render/invoiceFields'

export function isSystemWritten(path: string): boolean {
  return path === INVOICE_NUMBER_PATH || path.startsWith(`${ISSUER_ROOT}.`)
}

export function assertDataSatisfiesTemplate(
  doc: IDocument,
  data: Record<string, unknown>,
  items: unknown[],
  ignore: (path: string) => boolean = () => false,
): void {
  const missing = missingRequiredPaths(doc, data ?? {}, items, DETAIL_ITEM_ROOT).filter(
    (path) => !ignore(path),
  )
  if (missing.length === 0) return
  throw new CustomError({
    message: `Missing required data: ${missing.join(', ')}`,
    humanMessage: `Faltan datos obligatorios: ${missing.join(', ')}`,
    code: 'MISSING_REQUIRED_DATA',
    httpCode: 400,
    info: { paths: missing },
  })
}
