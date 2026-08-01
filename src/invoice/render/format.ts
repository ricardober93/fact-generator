import { MISSING, type IResolved } from './bind'
import type { IDocument, ITheme } from './document'

export const FORMATS = ['currency', 'number', 'date', 'percent'] as const

export type IFormat = (typeof FORMATS)[number]

export interface IFormatOptions {
  locale: string
  currency: string
}

function isKnownFormat(format: string): format is IFormat {
  return (FORMATS as readonly string[]).includes(format)
}

function asNumber(value: IResolved): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function asDate(value: IResolved): Date | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatValue(
  value: IResolved,
  format: string | undefined,
  options: IFormatOptions,
): string {
  if (value === MISSING) return ''
  if (!format || !isKnownFormat(format)) return String(value)
  if (format === 'date') {
    const date = asDate(value)
    return date ? new Intl.DateTimeFormat(options.locale).format(date) : String(value)
  }
  const numeric = asNumber(value)
  if (numeric === null) return String(value)
  if (format === 'currency') {
    return new Intl.NumberFormat(options.locale, {
      style: 'currency',
      currency: options.currency,
    }).format(numeric)
  }
  if (format === 'percent') {
    return new Intl.NumberFormat(options.locale, { style: 'percent' }).format(numeric)
  }
  return new Intl.NumberFormat(options.locale).format(numeric)
}

export function formatOptionsOf(doc: IDocument, theme: ITheme): IFormatOptions {
  const locale = typeof theme.locale === 'string' && theme.locale ? theme.locale : doc.locale
  const currency =
    typeof theme.currency === 'string' && theme.currency ? theme.currency : doc.currency
  return { locale, currency }
}
