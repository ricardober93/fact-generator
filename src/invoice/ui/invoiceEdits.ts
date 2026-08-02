import { lineAmount, grandTotal, sumAmounts } from '../render/money'
import {
  INVOICE_BASE_PATH,
  INVOICE_TAXES_PATH,
  INVOICE_TOTAL_PATH,
  ITEM_PRICE_KEY,
  ITEM_QUANTITY_KEY,
  ITEM_TOTAL_KEY,
} from '../render/invoiceFields'

export type IFormValue = string | number | boolean | null
export type IFormRecord = Record<string, unknown>

function segmentsOf(path: string): string[] {
  return path.split('.').filter((segment) => segment.length > 0)
}

export function readPath(source: IFormRecord, path: string): unknown {
  let current: unknown = source
  for (const segment of segmentsOf(path)) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as IFormRecord)[segment]
  }
  return current
}

export function writePath(source: IFormRecord, path: string, value: IFormValue): IFormRecord {
  const segments = segmentsOf(path)
  if (segments.length === 0) return source
  const [head, ...rest] = segments
  const child =
    rest.length === 0
      ? value
      : writePath((source[head] as IFormRecord) ?? {}, rest.join('.'), value)
  return { ...source, [head]: child }
}

export function addLine(items: IFormRecord[]): IFormRecord[] {
  return [...items, {}]
}

export function removeLine(items: IFormRecord[], index: number): IFormRecord[] {
  if (index < 0 || index >= items.length) return items
  return [...items.slice(0, index), ...items.slice(index + 1)]
}

export function moveLine(items: IFormRecord[], index: number, target: number): IFormRecord[] {
  if (index < 0 || index >= items.length) return items
  if (target < 0 || target >= items.length) return items
  const next = [...items]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  return next
}

export function withLineAmount(item: IFormRecord): IFormRecord {
  const quantity = item[ITEM_QUANTITY_KEY]
  const price = item[ITEM_PRICE_KEY]
  if (quantity === undefined || price === undefined) return item
  return { ...item, [ITEM_TOTAL_KEY]: lineAmount(quantity, price) }
}

export function applyFieldChange(
  data: IFormRecord,
  items: IFormRecord[],
  path: string,
  value: IFormValue,
): IFormRecord {
  const next = writePath(data, path, value)
  return path === INVOICE_TAXES_PATH ? withTotals(next, items) : next
}

export function withTotals(data: IFormRecord, items: IFormRecord[]): IFormRecord {
  const base = sumAmounts(items.map((item) => item[ITEM_TOTAL_KEY]))
  const taxes = readPath(data, INVOICE_TAXES_PATH)
  const withBase = writePath(data, INVOICE_BASE_PATH, base)
  return writePath(withBase, INVOICE_TOTAL_PATH, grandTotal(base, taxes))
}
