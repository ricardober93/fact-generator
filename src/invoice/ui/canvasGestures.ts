import { BAND_NAMES, usableWidthMm, type IBandName, type IDocument } from '../render/document'
import { boundsOf } from './arrange'
import { bandBoxOf } from './documentEdits'
import {
  clampRect,
  pxToMm,
  resizedRect,
  snapMm,
  MIN_SIZE_MM,
  type IHandle,
  type IRect,
} from './geometry'
import { snapCandidates, snappedRect, snappedResize, type IGuide } from './snapping'

export const SNAP_THRESHOLD_PX = 6

export interface IPointMm {
  xMm: number
  yMm: number
}

export interface IBandPoint extends IPointMm {
  band: IBandName
}

export interface IGesture {
  kind: 'move' | 'resize' | 'marquee'
  band: IBandName
  blockIds: string[]
  startRects: Record<string, IRect>
  originX: number
  originY: number
  originMm: IPointMm
  handle: IHandle
}

export interface IPreview {
  band: IBandName
  rects: Record<string, IRect>
  guides: IGuide[]
  marquee: IRect | null
}

export function isBandName(value: string | null): value is IBandName {
  return !!value && (BAND_NAMES as readonly string[]).includes(value)
}

export function rectOf(rect: IRect): IRect {
  return { xMm: rect.xMm, yMm: rect.yMm, widthMm: rect.widthMm, heightMm: rect.heightMm }
}

export function bandPointAt(clientX: number, clientY: number, doc: IDocument): IBandPoint | null {
  const element = document.elementFromPoint(clientX, clientY)
  const node = element?.closest('[data-band]') ?? null
  const band = node?.getAttribute('data-band') ?? null
  if (!node || !isBandName(band)) return null
  const box = node.getBoundingClientRect()
  const pxPerMm = box.width / usableWidthMm(doc.page)
  if (!Number.isFinite(pxPerMm) || pxPerMm <= 0) return null
  return {
    band,
    xMm: (clientX - box.left) / pxPerMm,
    yMm: (clientY - box.top) / pxPerMm,
  }
}

function siblingsOf(doc: IDocument, band: IBandName, blockIds: string[]): IRect[] {
  return doc.bands[band].blocks
    .filter((block) => !blockIds.includes(block.id))
    .map((block) => rectOf(block))
}

function thresholdMmOf(pxPerMm: number): number {
  return SNAP_THRESHOLD_PX / pxPerMm
}

export function movePreview(
  doc: IDocument,
  gesture: IGesture,
  delta: { xPx: number; yPx: number; pxPerMm: number; snap: boolean },
): IPreview {
  const box = boundsOf(Object.values(gesture.startRects))
  const bandBox = bandBoxOf(doc, gesture.band)
  const moved = clampRect(
    {
      ...box,
      xMm: box.xMm + snapMm(pxToMm(delta.xPx, delta.pxPerMm)),
      yMm: box.yMm + snapMm(pxToMm(delta.yPx, delta.pxPerMm)),
    },
    bandBox,
  )
  const siblings = siblingsOf(doc, gesture.band, gesture.blockIds)
  const snapped = delta.snap
    ? snappedRect(moved, siblings, bandBox, thresholdMmOf(delta.pxPerMm))
    : { rect: moved, guides: [] }
  const appliedX = snapped.rect.xMm - box.xMm
  const appliedY = snapped.rect.yMm - box.yMm
  const rects: Record<string, IRect> = {}
  for (const [blockId, start] of Object.entries(gesture.startRects)) {
    rects[blockId] = { ...start, xMm: start.xMm + appliedX, yMm: start.yMm + appliedY }
  }
  return { band: gesture.band, rects, guides: snapped.guides, marquee: null }
}

export function resizePreview(
  doc: IDocument,
  gesture: IGesture,
  delta: { xPx: number; yPx: number; pxPerMm: number; snap: boolean },
): IPreview {
  const blockId = gesture.blockIds[0]
  const bandBox = bandBoxOf(doc, gesture.band)
  const resized = resizedRect(
    gesture.startRects[blockId],
    delta.xPx,
    delta.yPx,
    delta.pxPerMm,
    bandBox,
    gesture.handle,
  )
  if (!delta.snap) {
    return { band: gesture.band, rects: { [blockId]: resized }, guides: [], marquee: null }
  }
  const candidates = snapCandidates(siblingsOf(doc, gesture.band, gesture.blockIds), bandBox)
  const snapped = snappedResize(resized, gesture.handle, candidates, thresholdMmOf(delta.pxPerMm))
  const rect = clampRect(
    {
      ...snapped.rect,
      widthMm: Math.max(MIN_SIZE_MM, snapped.rect.widthMm),
      heightMm: Math.max(MIN_SIZE_MM, snapped.rect.heightMm),
    },
    bandBox,
  )
  return { band: gesture.band, rects: { [blockId]: rect }, guides: snapped.guides, marquee: null }
}

export function marqueePreview(doc: IDocument, gesture: IGesture, point: IPointMm): IPreview {
  const xMm = Math.min(gesture.originMm.xMm, point.xMm)
  const yMm = Math.min(gesture.originMm.yMm, point.yMm)
  const marquee = clampRect(
    {
      xMm,
      yMm,
      widthMm: Math.abs(point.xMm - gesture.originMm.xMm),
      heightMm: Math.abs(point.yMm - gesture.originMm.yMm),
    },
    bandBoxOf(doc, gesture.band),
  )
  return { band: gesture.band, rects: {}, guides: [], marquee }
}

export function pickableBlockId(
  doc: IDocument,
  band: IBandName,
  blockId: string | null,
): string | null {
  if (!doc || !blockId) return null
  const block = doc.bands[band]?.blocks.find((candidate) => candidate.id === blockId)
  if (!block || block.decorative) return null
  return block.id
}
