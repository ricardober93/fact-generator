export type IDocType = 'factura' | 'notaCredito'

export const DOC_TYPES: readonly IDocType[] = ['factura', 'notaCredito']

export function isDocType(value: unknown): value is IDocType {
  return typeof value === 'string' && DOC_TYPES.includes(value as IDocType)
}
