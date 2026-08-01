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

export function resizedRect(
  start: IRect,
  deltaXPx: number,
  deltaYPx: number,
  pxPerMm: number,
  band: IBandBox,
): IRect {
  const resized = {
    ...start,
    widthMm: Math.max(MIN_SIZE_MM, snapMm(start.widthMm + pxToMm(deltaXPx, pxPerMm))),
    heightMm: Math.max(MIN_SIZE_MM, snapMm(start.heightMm + pxToMm(deltaYPx, pxPerMm))),
  }
  return clampRect(resized, band)
}
