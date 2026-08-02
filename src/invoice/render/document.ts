export const BAND_NAMES = ['header', 'detailHeader', 'detail', 'summary', 'pageFooter'] as const

export type IBandName = (typeof BAND_NAMES)[number]

export interface IPage {
  widthMm: number
  heightMm: number
  marginTopMm: number
  marginRightMm: number
  marginBottomMm: number
  marginLeftMm: number
}

export type IThemeValue = string | number

export type ITheme = Record<string, IThemeValue>

export type IParamType = 'string' | 'number' | 'boolean' | 'enum'

export interface IParamDeclaration {
  name: string
  type: IParamType
  token: string
  defaultValue: IThemeValue
  allowedValues?: IThemeValue[]
}

export type ITextMark = 'bold' | 'italic' | 'underline'

export interface ITextLiteralFragment {
  type: 'literal'
  text: string
  marks?: ITextMark[]
}

export interface ITextBindingFragment {
  type: 'binding'
  path: string
  format?: string
  marks?: ITextMark[]
}

export type ITextFragment = ITextLiteralFragment | ITextBindingFragment

export interface ITextContent {
  fragments: ITextFragment[]
}

export const CELL_ALIGNS = ['left', 'center', 'right'] as const

export type ICellAlign = (typeof CELL_ALIGNS)[number]

export interface ICell {
  label: string
  path: string
  format?: string
  widthMm: number
  align: ICellAlign
}

export type IPropValue = string | number | boolean | ITextContent | ICell[]

export function isCellList(value: unknown): value is ICell[] {
  return Array.isArray(value)
}

export function isTextContent(value: unknown): value is ITextContent {
  return typeof value === 'object' && value !== null && 'fragments' in value
}

export interface IBlock {
  id: string
  kind: string
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
  props: Record<string, IPropValue>
  decorative?: boolean
}

export interface IBand {
  heightMm: number
  blocks: IBlock[]
}

export type IBands = Record<IBandName, IBand>

export type IDataType = 'string' | 'number' | 'boolean' | 'date'

export interface IDataPath {
  path: string
  type: IDataType
  required: boolean
}

export const DETAIL_ITEM_ROOT = 'item'

export interface IDocument {
  version: 1
  page: IPage
  theme: ITheme
  params: IParamDeclaration[]
  dataSchema: IDataPath[]
  locale: string
  currency: string
  bands: IBands
}

export const A4_PORTRAIT: IPage = {
  widthMm: 210,
  heightMm: 297,
  marginTopMm: 15,
  marginRightMm: 15,
  marginBottomMm: 15,
  marginLeftMm: 15,
}

const DEFAULT_BAND_HEIGHTS_MM: Record<IBandName, number> = {
  header: 40,
  detailHeader: 8,
  detail: 8,
  summary: 30,
  pageFooter: 12,
}

export const DEFAULT_THEME: ITheme = {
  primary: '#0a58ca',
  text: '#111111',
  muted: '#666666',
  surface: '#ffffff',
  border: '#dddddd',
  fontFamily: 'Helvetica, Arial, sans-serif',
  fontSizeBase: '10pt',
  fontSizeSmall: '8pt',
  fontSizeTitle: '16pt',
  logo: '',
}

export function isTokenReference(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('@') && value.length > 1
}

export function tokenName(reference: string): string {
  return reference.slice(1)
}

export function usableWidthMm(page: IPage): number {
  return page.widthMm - page.marginLeftMm - page.marginRightMm
}

export function usableHeightMm(page: IPage): number {
  return page.heightMm - page.marginTopMm - page.marginBottomMm
}

function emptyBands(): IBands {
  const bands = {} as IBands
  for (const name of BAND_NAMES) {
    bands[name] = { heightMm: DEFAULT_BAND_HEIGHTS_MM[name], blocks: [] }
  }
  return bands
}

export const DEFAULT_LOCALE = 'es-ES'

export const DEFAULT_CURRENCY = 'EUR'

export function emptyDocument(page: IPage = A4_PORTRAIT): IDocument {
  return {
    version: 1,
    page: { ...page },
    theme: { ...DEFAULT_THEME },
    params: [],
    dataSchema: [],
    locale: DEFAULT_LOCALE,
    currency: DEFAULT_CURRENCY,
    bands: emptyBands(),
  }
}

function collectPropPaths(value: IPropValue, paths: Set<string>): void {
  if (isCellList(value)) {
    for (const cell of value) {
      if (cell && typeof cell.path === 'string' && cell.path) paths.add(cell.path)
    }
    return
  }
  if (!isTextContent(value)) return
  for (const fragment of value.fragments) {
    if (fragment.type === 'binding') paths.add(fragment.path)
  }
}

export function bindingPaths(doc: IDocument): string[] {
  const paths = new Set<string>()
  for (const band of Object.values(doc.bands)) {
    for (const block of band.blocks) {
      for (const value of Object.values(block.props)) collectPropPaths(value, paths)
    }
  }
  return [...paths]
}
