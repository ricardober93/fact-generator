import {
  isTokenReference,
  tokenName,
  usableWidthMm,
  type IPage,
  type IPropValue,
  type ITheme,
} from './document'

export const PAGE_FOOTER_CLASS = 'wb-page-footer'

export function tokenVariable(token: string): string {
  return `--${token.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

export function tokenVar(reference: IPropValue): string {
  if (!isTokenReference(reference)) return String(reference)
  return `var(${tokenVariable(tokenName(reference))})`
}

export function themeStyle(theme: ITheme): Record<string, string> {
  const style: Record<string, string> = {}
  for (const [token, value] of Object.entries(theme)) {
    style[tokenVariable(token)] = String(value)
  }
  return style
}

const EXACT_COLORS_CSS =
  '@media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }'

export const ROW_FILL_TOKEN = 'rowFill'
export const ROW_ALT_FILL_TOKEN = 'rowAltFill'

export function documentCss(theme: ITheme): string {
  if (!theme || !theme[ROW_ALT_FILL_TOKEN]) return ''
  return (
    `tbody tr:nth-child(even) td ` +
    `{ ${tokenVariable(ROW_FILL_TOKEN)}: var(${tokenVariable(ROW_ALT_FILL_TOKEN)}); }`
  )
}

function pageFooterPrintCss(page: IPage): string {
  return (
    `@media print { .${PAGE_FOOTER_CLASS} ` +
    `{ position: fixed; bottom: 0; width: ${usableWidthMm(page)}mm; } }`
  )
}

export function pageCss(page: IPage): string {
  if (!page) throw new Error('pageCss requires a page')
  const margin = [page.marginTopMm, page.marginRightMm, page.marginBottomMm, page.marginLeftMm]
    .map((value) => `${value}mm`)
    .join(' ')
  const size = `@page { size: ${page.widthMm}mm ${page.heightMm}mm; margin: ${margin}; }`
  return `${size} ${EXACT_COLORS_CSS} ${pageFooterPrintCss(page)}`
}
