import { isTokenReference, tokenName, type IPage, type IPropValue, type ITheme } from './document'

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

export function pageCss(page: IPage): string {
  const margin = [page.marginTopMm, page.marginRightMm, page.marginBottomMm, page.marginLeftMm]
    .map((value) => `${value}mm`)
    .join(' ')
  return `@page { size: ${page.widthMm}mm ${page.heightMm}mm; margin: ${margin}; }`
}
