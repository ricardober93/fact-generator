import type { IDocument, IParamDeclaration, ITheme, IThemeValue } from './document'

function coerce(declaration: IParamDeclaration, raw: unknown): IThemeValue | null {
  if (declaration.type === 'number') {
    const value = typeof raw === 'number' ? raw : Number(raw)
    return Number.isFinite(value) ? value : null
  }
  if (declaration.type === 'boolean') {
    if (raw === true || raw === 'true') return 'true'
    if (raw === false || raw === 'false') return 'false'
    return null
  }
  if (typeof raw !== 'string' && typeof raw !== 'number') return null
  return raw
}

function isAllowed(declaration: IParamDeclaration, value: IThemeValue): boolean {
  if (declaration.type !== 'enum') return true
  if (!declaration.allowedValues) return false
  return declaration.allowedValues.includes(value)
}

export function resolveParam(declaration: IParamDeclaration, raw: unknown): IThemeValue {
  if (raw === undefined || raw === null) return declaration.defaultValue
  const value = coerce(declaration, raw)
  if (value === null) return declaration.defaultValue
  if (!isAllowed(declaration, value)) return declaration.defaultValue
  return value
}

export function resolveTheme(doc: IDocument, params: Record<string, unknown> = {}): ITheme {
  if (!doc) {
    throw new Error('resolveTheme requires a document')
  }
  const theme: ITheme = { ...doc.theme }
  for (const declaration of doc.params) {
    theme[declaration.token] = resolveParam(declaration, params[declaration.name])
  }
  return theme
}
