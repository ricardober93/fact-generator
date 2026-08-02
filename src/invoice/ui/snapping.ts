import { clampRect, type IBandBox, type IRect } from './geometry'

export type ISnapAxis = 'x' | 'y'

export interface IGuide {
  axis: ISnapAxis
  positionMm: number
}

export interface ISnapCandidates {
  x: number[]
  y: number[]
}

export interface ISnapResult {
  rect: IRect
  guides: IGuide[]
}

function edgesOf(start: number, size: number): number[] {
  return [start, start + size / 2, start + size]
}

function unique(values: number[]): number[] {
  return [...new Set(values)]
}

export function snapCandidates(siblings: IRect[], band: IBandBox): ISnapCandidates {
  if (!Array.isArray(siblings)) throw new Error('snapCandidates requires a list of rects')
  if (!band) throw new Error('snapCandidates requires a band box')
  const x = edgesOf(0, band.widthMm)
  const y = edgesOf(0, band.heightMm)
  for (const sibling of siblings) {
    x.push(...edgesOf(sibling.xMm, sibling.widthMm))
    y.push(...edgesOf(sibling.yMm, sibling.heightMm))
  }
  return { x: unique(x), y: unique(y) }
}

interface IAxisSnap {
  delta: number
  positionMm: number
}

function bestSnap(edges: number[], candidates: number[], thresholdMm: number): IAxisSnap | null {
  let best: IAxisSnap | null = null
  for (const edge of edges) {
    for (const candidate of candidates) {
      const delta = candidate - edge
      if (Math.abs(delta) > thresholdMm) continue
      if (!best || Math.abs(delta) < Math.abs(best.delta)) best = { delta, positionMm: candidate }
    }
  }
  return best
}

export function snapRect(
  rect: IRect,
  candidates: ISnapCandidates,
  thresholdMm: number,
): ISnapResult {
  if (!rect) throw new Error('snapRect requires a rect')
  if (!candidates) throw new Error('snapRect requires candidates')
  if (!Number.isFinite(thresholdMm) || thresholdMm < 0) {
    throw new Error('snapRect requires a threshold in millimetres')
  }
  const horizontal = bestSnap(edgesOf(rect.xMm, rect.widthMm), candidates.x, thresholdMm)
  const vertical = bestSnap(edgesOf(rect.yMm, rect.heightMm), candidates.y, thresholdMm)
  const guides: IGuide[] = []
  if (horizontal) guides.push({ axis: 'x', positionMm: horizontal.positionMm })
  if (vertical) guides.push({ axis: 'y', positionMm: vertical.positionMm })
  return {
    rect: {
      ...rect,
      xMm: rect.xMm + (horizontal?.delta ?? 0),
      yMm: rect.yMm + (vertical?.delta ?? 0),
    },
    guides,
  }
}

function snapValue(valueMm: number, candidates: number[], thresholdMm: number): IAxisSnap | null {
  return bestSnap([valueMm], candidates, thresholdMm)
}

function snapSide(
  positionMm: number,
  sizeMm: number,
  candidates: number[],
  input: { thresholdMm: number; edge: 'start' | 'end' | 'none' },
): { positionMm: number; sizeMm: number; guide: IGuide | null; axis: ISnapAxis } {
  const base = { positionMm, sizeMm, guide: null, axis: 'x' as ISnapAxis }
  if (input.edge === 'none') return base
  const moving = input.edge === 'start' ? positionMm : positionMm + sizeMm
  const snap = snapValue(moving, candidates, input.thresholdMm)
  if (!snap) return base
  const guide = { axis: base.axis, positionMm: snap.positionMm }
  if (input.edge === 'end') return { positionMm, sizeMm: sizeMm + snap.delta, guide, axis: 'x' }
  return { positionMm: positionMm + snap.delta, sizeMm: sizeMm - snap.delta, guide, axis: 'x' }
}

export function snappedResize(
  rect: IRect,
  handle: string,
  candidates: ISnapCandidates,
  thresholdMm: number,
): ISnapResult {
  if (!rect) throw new Error('snappedResize requires a rect')
  const edgeX = handle.includes('w') ? 'start' : handle.includes('e') ? 'end' : 'none'
  const edgeY = handle.includes('n') ? 'start' : handle.includes('s') ? 'end' : 'none'
  const horizontal = snapSide(rect.xMm, rect.widthMm, candidates.x, { thresholdMm, edge: edgeX })
  const vertical = snapSide(rect.yMm, rect.heightMm, candidates.y, { thresholdMm, edge: edgeY })
  const guides: IGuide[] = []
  if (horizontal.guide) guides.push(horizontal.guide)
  if (vertical.guide) guides.push({ axis: 'y', positionMm: vertical.guide.positionMm })
  return {
    rect: {
      xMm: horizontal.positionMm,
      yMm: vertical.positionMm,
      widthMm: horizontal.sizeMm,
      heightMm: vertical.sizeMm,
    },
    guides,
  }
}

function guideHolds(rect: IRect, guide: IGuide): boolean {
  const edges =
    guide.axis === 'x' ? edgesOf(rect.xMm, rect.widthMm) : edgesOf(rect.yMm, rect.heightMm)
  return edges.some((edge) => Math.abs(edge - guide.positionMm) < 0.001)
}

export function snappedRect(
  rect: IRect,
  siblings: IRect[],
  band: IBandBox,
  thresholdMm: number,
): ISnapResult {
  const snapped = snapRect(rect, snapCandidates(siblings, band), thresholdMm)
  const clamped = clampRect(snapped.rect, band)
  return { rect: clamped, guides: snapped.guides.filter((guide) => guideHolds(clamped, guide)) }
}
