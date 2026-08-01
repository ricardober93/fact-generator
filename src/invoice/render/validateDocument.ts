import {
  BAND_NAMES,
  isTokenReference,
  tokenName,
  usableWidthMm,
  type IBand,
  type IBandName,
  type IBlock,
  type IDocument,
  type IPage,
  type ITheme,
} from './document'
import { enumValues, type IPropType } from './blocks/defineBlock'
import { findBlockDefinition } from './blocks/registry'

export interface IDocumentIssue {
  path: string
  message: string
}

const PAGE_MEASURES: (keyof IPage)[] = [
  'widthMm',
  'heightMm',
  'marginTopMm',
  'marginRightMm',
  'marginBottomMm',
  'marginLeftMm',
]

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPositiveNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function validatePage(page: unknown, issues: IDocumentIssue[]): void {
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

function validateTheme(theme: unknown, issues: IDocumentIssue[]): void {
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

function validateParams(params: unknown, theme: ITheme, issues: IDocumentIssue[]): void {
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

function validateProp(
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

function validateBlockProps(
  block: IBlock,
  path: string,
  theme: ITheme,
  issues: IDocumentIssue[],
): void {
  const definition = findBlockDefinition(block.kind)
  if (!definition) {
    issues.push({ path: `${path}.kind`, message: `unknown block kind "${block.kind}"` })
    return
  }
  if (!isPlainObject(block.props)) {
    issues.push({ path: `${path}.props`, message: 'props must be an object' })
    return
  }
  for (const propName of Object.keys(block.props)) {
    if (!(propName in definition.schema)) {
      issues.push({
        path: `${path}.props.${propName}`,
        message: `is not declared in the schema of "${block.kind}"`,
      })
    }
  }
  for (const [propName, propType] of Object.entries(definition.schema)) {
    if (!(propName in block.props)) {
      issues.push({ path: `${path}.props.${propName}`, message: 'is required by the schema' })
      continue
    }
    validateProp(propType, block.props[propName], `${path}.props.${propName}`, theme, issues)
  }
}

function validateBlockGeometry(
  block: IBlock,
  band: IBand,
  page: IPage,
  path: string,
  issues: IDocumentIssue[],
): void {
  const before = issues.length
  for (const measure of ['widthMm', 'heightMm'] as const) {
    if (!isPositiveNumber(block[measure])) {
      issues.push({ path: `${path}.${measure}`, message: 'must be a positive number in mm' })
    }
  }
  for (const measure of ['xMm', 'yMm'] as const) {
    if (typeof block[measure] !== 'number' || !Number.isFinite(block[measure])) {
      issues.push({ path: `${path}.${measure}`, message: 'must be a finite number in mm' })
    }
  }
  if (issues.length > before) return
  const availableWidthMm = usableWidthMm(page)
  if (!Number.isFinite(availableWidthMm) || !isPositiveNumber(band.heightMm)) return
  if (block.xMm < 0 || block.xMm + block.widthMm > availableWidthMm) {
    issues.push({ path, message: `does not fit the usable page width of ${availableWidthMm}mm` })
  }
  if (block.yMm < 0 || block.yMm + block.heightMm > band.heightMm) {
    issues.push({ path, message: `does not fit the band height of ${band.heightMm}mm` })
  }
}

function validateBand(
  bandName: IBandName,
  band: unknown,
  page: IPage,
  theme: ITheme,
  issues: IDocumentIssue[],
): void {
  const path = `bands.${bandName}`
  if (!isPlainObject(band)) {
    issues.push({ path, message: 'band must be an object' })
    return
  }
  if (!isPositiveNumber(band.heightMm)) {
    issues.push({ path: `${path}.heightMm`, message: 'must be a positive number in mm' })
  }
  if (!Array.isArray(band.blocks)) {
    issues.push({ path: `${path}.blocks`, message: 'blocks must be an array' })
    return
  }
  band.blocks.forEach((block: unknown, index: number) => {
    const blockPath = `${path}.blocks[${index}]`
    if (!isPlainObject(block) || typeof block.kind !== 'string') {
      issues.push({ path: blockPath, message: 'block must be an object with a kind' })
      return
    }
    validateBlockProps(block as unknown as IBlock, blockPath, theme, issues)
    validateBlockGeometry(
      block as unknown as IBlock,
      band as unknown as IBand,
      page,
      blockPath,
      issues,
    )
  })
}

function validateBands(bands: unknown, page: IPage, theme: ITheme, issues: IDocumentIssue[]): void {
  if (!isPlainObject(bands)) {
    issues.push({ path: 'bands', message: 'bands must be an object' })
    return
  }
  for (const bandName of Object.keys(bands)) {
    if (!BAND_NAMES.includes(bandName as IBandName)) {
      issues.push({ path: `bands.${bandName}`, message: 'is not one of the five known bands' })
    }
  }
  for (const bandName of BAND_NAMES) {
    if (!(bandName in bands)) {
      issues.push({ path: `bands.${bandName}`, message: 'is missing' })
      continue
    }
    validateBand(bandName, bands[bandName], page, theme, issues)
  }
}

export function validateDocument(doc: unknown): IDocumentIssue[] {
  const issues: IDocumentIssue[] = []
  if (!isPlainObject(doc)) {
    return [{ path: '', message: 'document must be an object' }]
  }
  if (doc.version !== 1) {
    issues.push({ path: 'version', message: 'must be 1' })
  }
  validatePage(doc.page, issues)
  validateTheme(doc.theme, issues)
  const theme = (isPlainObject(doc.theme) ? doc.theme : {}) as ITheme
  validateParams(doc.params, theme, issues)
  validateBands(doc.bands, (doc.page ?? {}) as IPage, theme, issues)
  return issues
}

export function isValidDocument(doc: unknown): doc is IDocument {
  return validateDocument(doc).length === 0
}
