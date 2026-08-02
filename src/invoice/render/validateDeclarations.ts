import type { IDataType, IPage, ITheme } from './document'
import { isPlainObject, type IDocumentIssue } from './validateProps'

const PAGE_MEASURES: (keyof IPage)[] = [
  'widthMm',
  'heightMm',
  'marginTopMm',
  'marginRightMm',
  'marginBottomMm',
  'marginLeftMm',
]

export function validatePage(page: unknown, issues: IDocumentIssue[]): void {
  if (!isPlainObject(page)) {
    issues.push({ path: 'page', message: 'page must be an object' })
    return
  }
  for (const measure of PAGE_MEASURES) {
    const value = page[measure]
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      issues.push({ path: `page.${measure}`, message: 'must be a finite number in mm' })
      continue
    }
    const mustBePositive = measure === 'widthMm' || measure === 'heightMm'
    if (mustBePositive && value <= 0) {
      issues.push({ path: `page.${measure}`, message: 'must be greater than zero' })
    }
    if (!mustBePositive && value < 0) {
      issues.push({ path: `page.${measure}`, message: 'must not be negative' })
    }
  }
}

export function validateTheme(theme: unknown, issues: IDocumentIssue[]): void {
  if (!isPlainObject(theme)) {
    issues.push({ path: 'theme', message: 'theme must be an object' })
    return
  }
  for (const [token, value] of Object.entries(theme)) {
    if (typeof value !== 'string' && typeof value !== 'number') {
      issues.push({ path: `theme.${token}`, message: 'token value must be a string or a number' })
    }
  }
}

export function validateParams(params: unknown, theme: ITheme, issues: IDocumentIssue[]): void {
  if (!Array.isArray(params)) {
    issues.push({ path: 'params', message: 'params must be an array' })
    return
  }
  params.forEach((param, index) => {
    const path = `params[${index}]`
    if (!isPlainObject(param)) {
      issues.push({ path, message: 'param declaration must be an object' })
      return
    }
    if (typeof param.name !== 'string' || param.name.length === 0) {
      issues.push({ path: `${path}.name`, message: 'must be a non-empty string' })
    }
    if (typeof param.token !== 'string' || !(param.token in theme)) {
      issues.push({ path: `${path}.token`, message: 'must reference a token declared in theme' })
    }
    if (param.type === 'enum' && !Array.isArray(param.allowedValues)) {
      issues.push({ path: `${path}.allowedValues`, message: 'enum params require allowedValues' })
    }
  })
}

const DATA_TYPES: IDataType[] = ['string', 'number', 'boolean', 'date']

export function validateDataSchema(dataSchema: unknown, issues: IDocumentIssue[]): void {
  if (!Array.isArray(dataSchema)) {
    issues.push({ path: 'dataSchema', message: 'dataSchema must be an array' })
    return
  }
  dataSchema.forEach((entry, index) => {
    const path = `dataSchema[${index}]`
    if (!isPlainObject(entry)) {
      issues.push({ path, message: 'data path declaration must be an object' })
      return
    }
    if (typeof entry.path !== 'string' || entry.path.length === 0) {
      issues.push({ path: `${path}.path`, message: 'must be a non-empty string' })
    }
    if (!DATA_TYPES.includes(entry.type as IDataType)) {
      issues.push({ path: `${path}.type`, message: `must be one of: ${DATA_TYPES.join(', ')}` })
    }
    if (typeof entry.required !== 'boolean') {
      issues.push({ path: `${path}.required`, message: 'must be a boolean' })
    }
  })
}
