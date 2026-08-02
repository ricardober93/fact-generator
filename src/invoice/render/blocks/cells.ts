import { isCellList, type IBlock, type ICell } from '../document'
import { formatValue } from '../format'
import { tokenVar } from '../printCss'
import type { IRenderContext } from './defineBlock'

export const CELLS_SCHEMA = {
  cells: 'cells',
  color: 'token',
  fontFamily: 'token',
  fontSize: 'token',
} as const

export const CELLS_STYLE_DEFAULTS = {
  color: '@text',
  fontFamily: '@fontFamily',
  fontSize: '@fontSizeBase',
} as const

export function cellsOf(block: IBlock): ICell[] {
  if (!block) throw new Error('cellsOf requires a block')
  const value = block.props.cells
  return isCellList(value) ? value : []
}

export function cellText(cell: ICell, ctx: IRenderContext): string {
  if (!cell) throw new Error('cellText requires a cell')
  return formatValue(ctx.resolve(cell.path), cell.format, ctx.format)
}

export function frameStyle(block: IBlock, direction: 'row' | 'column'): Record<string, string> {
  if (!block) throw new Error('frameStyle requires a block')
  return {
    display: 'flex',
    flexDirection: direction,
    alignItems: direction === 'row' ? 'center' : 'stretch',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    color: tokenVar(block.props.color),
    fontFamily: tokenVar(block.props.fontFamily),
    fontSize: tokenVar(block.props.fontSize),
  }
}

export function cellStyle(cell: ICell): Record<string, string> {
  if (!cell) throw new Error('cellStyle requires a cell')
  return {
    flex: `0 0 ${cell.widthMm}mm`,
    width: `${cell.widthMm}mm`,
    boxSizing: 'border-box',
    padding: '0 2mm',
    textAlign: cell.align,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  }
}
