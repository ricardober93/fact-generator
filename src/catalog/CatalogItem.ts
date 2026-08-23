export interface ICatalogItem {
  ref: string
  code: string
  label: string
  unitPrice: number
  taxRate: number
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function amount(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function readCatalogItem(raw: unknown): ICatalogItem | null {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Record<string, unknown>
  const ref = text(source.ref)
  const label = text(source.label)
  const unitPrice = amount(source.unitPrice)
  if (ref.length === 0 || label.length === 0 || unitPrice === null) return null
  return {
    ref,
    code: text(source.code),
    label,
    unitPrice,
    taxRate: amount(source.taxRate) ?? 0,
  }
}

export function readCatalogItems(raw: unknown): ICatalogItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map(readCatalogItem).filter((item): item is ICatalogItem => item !== null)
}
