import { CELL_ALIGNS, isTokenReference, tokenName, type ICellAlign, type ITheme } from './document'
import { enumValues, type IPropType } from './blocks/defineBlock'

export interface IDocumentIssue {
  path: string
  message: string
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isPositiveNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function validateTokenProp(
  value: unknown,
  path: string,
  theme: ITheme,
  issues: IDocumentIssue[],
): void {
  if (!isTokenReference(value)) {
    issues.push({ path, message: 'must be a token reference starting with "@", not a literal' })
    return
  }
  if (!(tokenName(value) in theme)) {
    issues.push({ path, message: `token "${tokenName(value)}" is not declared in theme` })
  }
}

function validateTextProp(value: unknown, path: string, issues: IDocumentIssue[]): void {
  if (!isPlainObject(value) || !Array.isArray(value.fragments)) {
    issues.push({ path, message: 'text content must be an object with a fragments array' })
    return
  }
  value.fragments.forEach((fragment: unknown, index: number) => {
    const fragmentPath = `${path}.fragments[${index}]`
    if (!isPlainObject(fragment)) {
      issues.push({ path: fragmentPath, message: 'fragment must be an object' })
      return
    }
    if (fragment.type === 'literal' && typeof fragment.text === 'string') return
    if (fragment.type === 'binding' && typeof fragment.path === 'string') return
    issues.push({ path: fragmentPath, message: 'fragment must be a literal or a binding' })
  })
}

function validateCell(cell: unknown, path: string, issues: IDocumentIssue[]): void {
  if (!isPlainObject(cell)) {
    issues.push({ path, message: 'cell must be an object' })
    return
  }
  if (typeof cell.label !== 'string') {
    issues.push({ path: `${path}.label`, message: 'must be a string' })
  }
  if (typeof cell.path !== 'string') {
    issues.push({ path: `${path}.path`, message: 'must be a string' })
  }
  if (!isPositiveNumber(cell.widthMm)) {
    issues.push({ path: `${path}.widthMm`, message: 'must be a positive number in mm' })
  }
  if (!CELL_ALIGNS.includes(cell.align as ICellAlign)) {
    issues.push({ path: `${path}.align`, message: `must be one of: ${CELL_ALIGNS.join(', ')}` })
  }
}

function validateCellsProp(value: unknown, path: string, issues: IDocumentIssue[]): void {
  if (!Array.isArray(value)) {
    issues.push({ path, message: 'cells must be an array' })
    return
  }
  value.forEach((cell: unknown, index: number) => validateCell(cell, `${path}[${index}]`, issues))
}

export function validateProp(
  propType: IPropType,
  value: unknown,
  path: string,
  theme: ITheme,
  issues: IDocumentIssue[],
): void {
  if (propType === 'token' || propType === 'asset') {
    validateTokenProp(value, path, theme, issues)
    return
  }
  if (propType === 'text') {
    validateTextProp(value, path, issues)
    return
  }
  if (propType === 'cells') {
    validateCellsProp(value, path, issues)
    return
  }
  if (propType.startsWith('enum:')) {
    const allowed = enumValues(propType)
    if (typeof value !== 'string' || !allowed.includes(value)) {
      issues.push({ path, message: `must be one of: ${allowed.join(', ')}` })
    }
    return
  }
  if (typeof value !== propType) {
    issues.push({ path, message: `must be a ${propType}` })
  }
}
