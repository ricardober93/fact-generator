import { applyDefaults } from '../render/blocks/registry'
import type { IBlock, ICell, IPropValue, ITextFragment, ITextMark } from '../render/document'

export interface IRect {
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
}

export type IProps = Record<string, IPropValue>

function assertId(id: string, caller: string): void {
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error(`${caller} requires a non-empty block id`)
  }
}

function assertRect(rect: IRect, caller: string): void {
  if (!rect) throw new Error(`${caller} requires a rect`)
  for (const measure of ['xMm', 'yMm', 'widthMm', 'heightMm'] as const) {
    if (!Number.isFinite(rect[measure])) {
      throw new Error(`${caller} requires a finite ${measure}`)
    }
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function rounded(rect: IRect): IRect {
  return {
    xMm: round(rect.xMm),
    yMm: round(rect.yMm),
    widthMm: round(rect.widthMm),
    heightMm: round(rect.heightMm),
  }
}

export function literal(text: string, marks?: ITextMark[]): ITextFragment {
  if (typeof text !== 'string') throw new Error('literal requires a string')
  return marks ? { type: 'literal', text, marks } : { type: 'literal', text }
}

export function binding(
  path: string,
  options: { format?: string; marks?: ITextMark[] } = {},
): ITextFragment {
  if (!path) throw new Error('binding requires a data path')
  return { type: 'binding', path, ...options }
}

export function bold(text: string): ITextFragment {
  return literal(text, ['bold'])
}

export function textBlock(
  id: string,
  rect: IRect,
  fragments: ITextFragment[],
  props: IProps = {},
): IBlock {
  assertId(id, 'textBlock')
  assertRect(rect, 'textBlock')
  if (!Array.isArray(fragments)) throw new Error('textBlock requires a fragment array')
  return applyDefaults('text', {
    id,
    ...rounded(rect),
    props: { ...props, content: { fragments } },
  })
}

export function boxBlock(id: string, rect: IRect, props: IProps = {}): IBlock {
  assertId(id, 'boxBlock')
  assertRect(rect, 'boxBlock')
  const fill = props.fill ?? '@surface'
  return applyDefaults('box', {
    id,
    ...rounded(rect),
    props: { border: fill, borderWidthMm: 0, ...props, fill },
  })
}

export function decoration(block: IBlock): IBlock {
  if (!block) throw new Error('decoration requires a block')
  return { ...block, decorative: true }
}

export function lineBlock(id: string, rect: IRect, props: IProps = {}): IBlock {
  assertId(id, 'lineBlock')
  assertRect(rect, 'lineBlock')
  const thicknessMm = rect.heightMm
  return applyDefaults('line', { id, ...rounded(rect), props: { thicknessMm, ...props } })
}

export function verticalLineBlock(id: string, rect: IRect, props: IProps = {}): IBlock {
  return lineBlock(id, rect, { thicknessMm: rect.widthMm, orientation: 'vertical', ...props })
}

export function imageBlock(id: string, rect: IRect, props: IProps = {}): IBlock {
  assertId(id, 'imageBlock')
  assertRect(rect, 'imageBlock')
  return applyDefaults('image', { id, ...rounded(rect), props })
}

export function tableBlock(id: string, rect: IRect, cells: ICell[], props: IProps = {}): IBlock {
  assertId(id, 'tableBlock')
  assertRect(rect, 'tableBlock')
  if (!Array.isArray(cells) || cells.length === 0) {
    throw new Error('tableBlock requires at least one cell')
  }
  return applyDefaults('table', { id, ...rounded(rect), props: { ...props, cells } })
}

export interface IChevron {
  tipXMm: number
  tipYMm: number
  sizeMm: number
  thicknessMm: number
  fill: string
}

export function chevronBlocks(id: string, chevron: IChevron): IBlock[] {
  assertId(id, 'chevronBlocks')
  const { tipXMm, tipYMm, sizeMm, thicknessMm, fill } = chevron
  if (!(sizeMm > 0) || !(thicknessMm > 0)) {
    throw new Error('chevronBlocks requires a positive size and thickness')
  }
  const widthMm = sizeMm * Math.SQRT2
  const xMm = tipXMm - sizeMm / 2 - widthMm / 2
  const arm = { widthMm, heightMm: thicknessMm }
  return [
    decoration(
      boxBlock(
        `${id}Top`,
        { xMm, yMm: tipYMm - sizeMm / 2 - thicknessMm / 2, ...arm },
        { fill, rotationDeg: 45 },
      ),
    ),
    decoration(
      boxBlock(
        `${id}Bottom`,
        { xMm, yMm: tipYMm + sizeMm / 2 - thicknessMm / 2, ...arm },
        { fill, rotationDeg: -45 },
      ),
    ),
  ]
}
