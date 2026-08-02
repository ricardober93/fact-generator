import {
  BAND_NAMES,
  bindingPaths,
  usableWidthMm,
  type IBand,
  type IBandName,
  type IBlock,
  type IDocument,
  type IPage,
  type ITheme,
} from './document'
import { acceptsBand, findBlockDefinition } from './blocks/registry'
import { isPlainObject, isPositiveNumber, validateProp, type IDocumentIssue } from './validateProps'
import {
  validateDataSchema,
  validatePage,
  validateParams,
  validateTheme,
} from './validateDeclarations'

export type { IDocumentIssue }

function validateBlockProps(
  block: IBlock,
  bandName: IBandName,
  path: string,
  theme: ITheme,
  issues: IDocumentIssue[],
): void {
  const definition = findBlockDefinition(block.kind)
  if (!definition) {
    issues.push({ path: `${path}.kind`, message: `unknown block kind "${block.kind}"` })
    return
  }
  if (!acceptsBand(definition, bandName)) {
    issues.push({
      path: `${path}.kind`,
      message: `block kind "${block.kind}" is not allowed in band "${bandName}"`,
    })
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
    validateBlockProps(block as unknown as IBlock, bandName, blockPath, theme, issues)
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

function validateDeclaredBindings(doc: IDocument, issues: IDocumentIssue[]): void {
  const declared = new Set(doc.dataSchema.map((entry) => entry.path))
  for (const path of bindingPaths(doc)) {
    if (!declared.has(path)) {
      issues.push({ path: 'dataSchema', message: `binding "${path}" is not declared` })
    }
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
  if (typeof doc.locale !== 'string' || doc.locale.length === 0) {
    issues.push({ path: 'locale', message: 'must be a non-empty string' })
  }
  if (typeof doc.currency !== 'string' || doc.currency.length === 0) {
    issues.push({ path: 'currency', message: 'must be a non-empty string' })
  }
  validatePage(doc.page, issues)
  validateTheme(doc.theme, issues)
  const theme = (isPlainObject(doc.theme) ? doc.theme : {}) as ITheme
  validateParams(doc.params, theme, issues)
  validateDataSchema(doc.dataSchema, issues)
  validateBands(doc.bands, (doc.page ?? {}) as IPage, theme, issues)
  if (Array.isArray(doc.dataSchema) && isPlainObject(doc.bands)) {
    validateDeclaredBindings(doc as unknown as IDocument, issues)
  }
  return issues
}

export function isValidDocument(doc: unknown): doc is IDocument {
  return validateDocument(doc).length === 0
}
