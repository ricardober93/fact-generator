import type { IArithmeticIssue } from '../models/invoice/checkArithmetic'
import type { IIssueRejection } from '../models/invoice/InvoiceRepository'

const REFUSALS: Record<IIssueRejection, string> = {
  NO_NUMBER_RANGE: 'No hay ningún rango de numeración. Crea uno antes de emitir.',
  RANGE_EXHAUSTED: 'El rango de numeración se agotó.',
  RANGE_EXPIRED: 'El rango de numeración está fuera de vigencia.',
  NUMBER_OUT_OF_RANGE: 'Ese número no pertenece a ningún rango vigente.',
  AMBIGUOUS_PREFIX: 'Hay varios prefijos posibles. Elige uno.',
  NUMBER_ALREADY_USED: 'Ese número ya lo tiene otro documento.',
  ARITHMETIC_MISMATCH: 'Los importes no cuadran.',
  MISSING_REASON: 'Una nota de crédito necesita un motivo.',
  CORRECTED_NOT_FOUND: 'No se encuentra la factura que corrige.',
  CORRECTED_NOT_ISSUED: 'Solo se puede corregir una factura ya emitida.',
}

function wordFor(issue: IArithmeticIssue): string {
  if (issue.kind === 'line') return `línea ${(issue.line ?? 0) + 1}`
  return issue.kind === 'base' ? 'la base' : 'el total'
}

export function issueRefusal(reason: IIssueRejection, issues: IArithmeticIssue[] = []): string {
  const message = REFUSALS[reason] ?? 'No se pudo emitir.'
  if (reason !== 'ARITHMETIC_MISMATCH' || issues.length === 0) return message
  return `${message} Revisa ${issues.map(wordFor).join(', ')}.`
}

export function issuedMessage(numero: string): string {
  return `Emitida ${numero}`
}
