import { MISSING, resolvePath } from '../../../kernel/paths'
import {
  INVOICE_BASE_PATH,
  INVOICE_TAXES_PATH,
  INVOICE_TOTAL_PATH,
  ITEM_PRICE_KEY,
  ITEM_QUANTITY_KEY,
  ITEM_TOTAL_KEY,
} from '../../render/invoiceFields'
import { toCents } from '../../../kernel/cents'
import { lineAmount } from '../../render/money'
import type { IInvoiceRecord } from './Invoice'

export type IArithmeticIssueKind = 'line' | 'base' | 'total'

export interface IArithmeticIssue {
  kind: IArithmeticIssueKind
  line?: number
  expected: number
  found: number
}

function amountOf(value: unknown): number | null {
  if (value === MISSING || value === null || value === undefined) return null
  if (typeof value === 'string' && value.trim() === '') return null
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return null
  return toCents(numeric)
}

function pathAmount(data: IInvoiceRecord, path: string): number | null {
  return amountOf(resolvePath(data, path))
}

function issue(kind: IArithmeticIssueKind, expected: number, found: number): IArithmeticIssue {
  return { kind, expected: expected / 100, found: found / 100 }
}

function checkLines(items: IInvoiceRecord[]): IArithmeticIssue[] {
  const issues: IArithmeticIssue[] = []
  items.forEach((item, index) => {
    const quantity = amountOf(item[ITEM_QUANTITY_KEY])
    const price = amountOf(item[ITEM_PRICE_KEY])
    const total = amountOf(item[ITEM_TOTAL_KEY])
    if (quantity === null || price === null || total === null) return
    const expected = toCents(lineAmount(item[ITEM_QUANTITY_KEY], item[ITEM_PRICE_KEY]))
    if (expected === total) return
    issues.push({ ...issue('line', expected, total), line: index })
  })
  return issues
}

function checkBase(data: IInvoiceRecord, items: IInvoiceRecord[]): IArithmeticIssue[] {
  const base = pathAmount(data, INVOICE_BASE_PATH)
  if (base === null || items.length === 0) return []
  const totals = items.map((item) => amountOf(item[ITEM_TOTAL_KEY]))
  if (totals.some((total) => total === null)) return []
  const expected = totals.reduce((sum: number, total) => sum + (total ?? 0), 0)
  return expected === base ? [] : [issue('base', expected, base)]
}

function checkTotal(data: IInvoiceRecord): IArithmeticIssue[] {
  const total = pathAmount(data, INVOICE_TOTAL_PATH)
  const base = pathAmount(data, INVOICE_BASE_PATH)
  if (total === null || base === null) return []
  const expected = base + (pathAmount(data, INVOICE_TAXES_PATH) ?? 0)
  return expected === total ? [] : [issue('total', expected, total)]
}

export function checkArithmetic(data: IInvoiceRecord, items: IInvoiceRecord[]): IArithmeticIssue[] {
  const record = data ?? {}
  const lines = Array.isArray(items) ? items : []
  return [...checkLines(lines), ...checkBase(record, lines), ...checkTotal(record)]
}
