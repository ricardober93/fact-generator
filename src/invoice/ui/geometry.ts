export interface IRect {
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
}

export interface IBandBox {
  widthMm: number
  heightMm: number
}

export const MIN_SIZE_MM = 1

export function snapMm(value: number): number {
  return Math.round(value)
}

export function pxToMm(px: number, pxPerMm: number): number {
  if (!Number.isFinite(px)) throw new Error('pxToMm requires a finite pixel distance')
  if (!Number.isFinite(pxPerMm) || pxPerMm <= 0) {
    throw new Error('pxToMm requires a positive scale')
  }
  return px / pxPerMm
}

function clampBetween(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

export function clampRect(rect: IRect, band: IBandBox): IRect {
  if (!rect) throw new Error('clampRect requires a rect')
  if (!band) throw new Error('clampRect requires a band box')
  const widthMm = clampBetween(rect.widthMm, 0, band.widthMm)
  const heightMm = clampBetween(rect.heightMm, 0, band.heightMm)
  return {
    xMm: clampBetween(rect.xMm, 0, band.widthMm - widthMm),
    yMm: clampBetween(rect.yMm, 0, band.heightMm - heightMm),
    widthMm,
    heightMm,
  }
}

export function movedRect(
  start: IRect,
  deltaXPx: number,
  deltaYPx: number,
  pxPerMm: number,
  band: IBandBox,
): IRect {
  const moved = {
    ...start,
    xMm: snapMm(start.xMm + pxToMm(deltaXPx, pxPerMm)),
    yMm: snapMm(start.yMm + pxToMm(deltaYPx, pxPerMm)),
  }
  return clampRect(moved, band)
}

export const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const

export type IHandle = (typeof HANDLES)[number]

type IMovingEdge = 'start' | 'end' | 'none'

function movingEdge(handle: IHandle, startMark: string, endMark: string): IMovingEdge {
  if (handle.includes(startMark)) return 'start'
  if (handle.includes(endMark)) return 'end'
  return 'none'
}

function resizedAxis(
  positionMm: number,
  sizeMm: number,
  deltaMm: number,
  edge: IMovingEdge,
): { positionMm: number; sizeMm: number } {
  if (edge === 'none') return { positionMm, sizeMm }
  if (edge === 'end') return { positionMm, sizeMm: Math.max(MIN_SIZE_MM, sizeMm + deltaMm) }
  const nextSizeMm = Math.max(MIN_SIZE_MM, sizeMm - deltaMm)
  return { positionMm: positionMm + sizeMm - nextSizeMm, sizeMm: nextSizeMm }
}

export function resizedRect(
  start: IRect,
  deltaXPx: number,
  deltaYPx: number,
  pxPerMm: number,
  band: IBandBox,
  handle: IHandle = 'se',
): IRect {
  const deltaXMm = snapMm(pxToMm(deltaXPx, pxPerMm))
  const deltaYMm = snapMm(pxToMm(deltaYPx, pxPerMm))
  const horizontal = resizedAxis(start.xMm, start.widthMm, deltaXMm, movingEdge(handle, 'w', 'e'))
  const vertical = resizedAxis(start.yMm, start.heightMm, deltaYMm, movingEdge(handle, 'n', 's'))
  return clampRect(
    {
      xMm: horizontal.positionMm,
      yMm: vertical.positionMm,
      widthMm: horizontal.sizeMm,
      heightMm: vertical.sizeMm,
    },
    band,
  )
}
