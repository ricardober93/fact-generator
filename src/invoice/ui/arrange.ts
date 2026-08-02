import { acceptsBand, applyDefaults, findBlockDefinition } from '../render/blocks/registry'
import type { IBandName, IBlock, IDocument } from '../render/document'
import { bandBoxOf } from './documentEdits'
import { clampRect, type IRect } from './geometry'

export const ALIGNMENTS = ['left', 'centerX', 'right', 'top', 'middle', 'bottom'] as const

export type IAlignment = (typeof ALIGNMENTS)[number]

export type IAxis = 'x' | 'y'

export interface IAddedBlocks {
  doc: IDocument
  blockIds: string[]
}

function blocksOf(doc: IDocument, band: IBandName, blockIds: string[]): IBlock[] {
  if (!doc || !doc.bands || !doc.bands[band]) throw new Error(`unknown band "${band}"`)
  if (!Array.isArray(blockIds)) throw new Error('a list of block ids is required')
  return doc.bands[band].blocks.filter((block) => blockIds.includes(block.id))
}

export function boundsOf(blocks: IRect[]): IRect {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    throw new Error('boundsOf requires at least one rect')
  }
  const left = Math.min(...blocks.map((block) => block.xMm))
  const top = Math.min(...blocks.map((block) => block.yMm))
  const right = Math.max(...blocks.map((block) => block.xMm + block.widthMm))
  const bottom = Math.max(...blocks.map((block) => block.yMm + block.heightMm))
  return { xMm: left, yMm: top, widthMm: right - left, heightMm: bottom - top }
}

function withBlocks(doc: IDocument, band: IBandName, next: IBlock[]): IDocument {
  const clone = structuredClone(doc)
  clone.bands[band].blocks = next
  return clone
}

function mapSelected(
  doc: IDocument,
  band: IBandName,
  blockIds: string[],
  change: (block: IBlock) => IBlock,
): IDocument {
  const next = doc.bands[band].blocks.map((block) =>
    blockIds.includes(block.id) ? change(block) : block,
  )
  return withBlocks(doc, band, next)
}

export function moveBlocks(
  doc: IDocument,
  band: IBandName,
  blockIds: string[],
  deltaXMm: number,
  deltaYMm: number,
): IDocument {
  const blocks = blocksOf(doc, band, blockIds)
  if (blocks.length === 0) return doc
  const box = boundsOf(blocks)
  const bounded = clampRect(
    { ...box, xMm: box.xMm + deltaXMm, yMm: box.yMm + deltaYMm },
    bandBoxOf(doc, band),
  )
  const appliedX = bounded.xMm - box.xMm
  const appliedY = bounded.yMm - box.yMm
  if (appliedX === 0 && appliedY === 0) return doc
  return mapSelected(doc, band, blockIds, (block) => ({
    ...block,
    xMm: block.xMm + appliedX,
    yMm: block.yMm + appliedY,
  }))
}

function alignedPosition(block: IBlock, box: IRect, alignment: IAlignment): Partial<IBlock> {
  if (alignment === 'left') return { xMm: box.xMm }
  if (alignment === 'right') return { xMm: box.xMm + box.widthMm - block.widthMm }
  if (alignment === 'centerX') {
    return { xMm: box.xMm + (box.widthMm - block.widthMm) / 2 }
  }
  if (alignment === 'top') return { yMm: box.yMm }
  if (alignment === 'bottom') return { yMm: box.yMm + box.heightMm - block.heightMm }
  return { yMm: box.yMm + (box.heightMm - block.heightMm) / 2 }
}

export function alignBlocks(
  doc: IDocument,
  band: IBandName,
  blockIds: string[],
  alignment: IAlignment,
): IDocument {
  const blocks = blocksOf(doc, band, blockIds)
  if (blocks.length < 2) return doc
  const box = boundsOf(blocks)
  return mapSelected(doc, band, blockIds, (block) => ({
    ...block,
    ...alignedPosition(block, box, alignment),
  }))
}

function gapOf(blocks: IBlock[], axis: IAxis): number {
  const box = boundsOf(blocks)
  const total = axis === 'x' ? box.widthMm : box.heightMm
  const used = blocks.reduce(
    (sum, block) => sum + (axis === 'x' ? block.widthMm : block.heightMm),
    0,
  )
  return (total - used) / (blocks.length - 1)
}

export function distributeBlocks(
  doc: IDocument,
  band: IBandName,
  blockIds: string[],
  axis: IAxis,
): IDocument {
  const blocks = blocksOf(doc, band, blockIds)
  if (blocks.length < 3) return doc
  const key = axis === 'x' ? 'xMm' : 'yMm'
  const sizeKey = axis === 'x' ? 'widthMm' : 'heightMm'
  const ordered = [...blocks].sort((left, right) => left[key] - right[key])
  const gap = gapOf(blocks, axis)
  const positions = new Map<string, number>()
  let cursor = ordered[0][key]
  for (const block of ordered) {
    positions.set(block.id, cursor)
    cursor += block[sizeKey] + gap
  }
  return mapSelected(doc, band, blockIds, (block) => ({
    ...block,
    [key]: positions.get(block.id) ?? block[key],
  }))
}

export function copiedBlocks(doc: IDocument, band: IBandName, blockIds: string[]): IBlock[] {
  return blocksOf(doc, band, blockIds).map((block) => structuredClone(block))
}

export function pasteBlocks(
  doc: IDocument,
  band: IBandName,
  blocks: IBlock[],
  offsetMm = 2,
): IAddedBlocks {
  if (!Array.isArray(blocks)) throw new Error('a list of blocks is required')
  const box = bandBoxOf(doc, band)
  const pasted = blocks.map((block) => ({
    ...structuredClone(block),
    id: crypto.randomUUID(),
    ...clampRect({ ...block, xMm: block.xMm + offsetMm, yMm: block.yMm + offsetMm }, box),
  }))
  const next = withBlocks(doc, band, [...doc.bands[band].blocks, ...pasted])
  return { doc: next, blockIds: pasted.map((block) => block.id) }
}

export function duplicateBlocks(
  doc: IDocument,
  band: IBandName,
  blockIds: string[],
  offsetMm = 2,
): IAddedBlocks {
  return pasteBlocks(doc, band, copiedBlocks(doc, band, blockIds), offsetMm)
}

export function reorderBlock(
  doc: IDocument,
  band: IBandName,
  blockId: string,
  toIndex: number,
): IDocument {
  const blocks = [...(doc.bands[band]?.blocks ?? [])]
  const from = blocks.findIndex((block) => block.id === blockId)
  if (from < 0) throw new Error(`block "${blockId}" is not in band "${band}"`)
  const target = Math.min(Math.max(toIndex, 0), blocks.length - 1)
  const [moved] = blocks.splice(from, 1)
  blocks.splice(target, 0, moved)
  return withBlocks(doc, band, blocks)
}

export function blocksWithin(doc: IDocument, band: IBandName, rect: IRect): string[] {
  if (!rect) throw new Error('blocksWithin requires a rect')
  return (doc.bands[band]?.blocks ?? [])
    .filter(
      (block) =>
        block.xMm >= rect.xMm &&
        block.yMm >= rect.yMm &&
        block.xMm + block.widthMm <= rect.xMm + rect.widthMm &&
        block.yMm + block.heightMm <= rect.yMm + rect.heightMm,
    )
    .map((block) => block.id)
}

export function addBlockAt(
  doc: IDocument,
  band: IBandName,
  kind: string,
  xMm: number,
  yMm: number,
): IAddedBlocks {
  if (!kind) throw new Error('a block kind is required')
  const definition = findBlockDefinition(kind)
  if (!definition) throw new Error(`Unknown block kind "${kind}"`)
  if (!acceptsBand(definition, band)) {
    throw new Error(`block kind "${kind}" is not allowed in band "${band}"`)
  }
  const block = applyDefaults(kind)
  const bounded = clampRect({ ...block, xMm, yMm }, bandBoxOf(doc, band))
  const next = withBlocks(doc, band, [...doc.bands[band].blocks, { ...block, ...bounded }])
  return { doc: next, blockIds: [block.id] }
}
