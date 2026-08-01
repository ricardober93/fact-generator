import { applyDefaults } from '../render/blocks/registry'
import {
  usableWidthMm,
  type IBandName,
  type IBlock,
  type IDocument,
  type IPropValue,
  type IThemeValue,
} from '../render/document'
import { clampRect, type IBandBox, type IRect } from './geometry'

export interface IAddedBlock {
  doc: IDocument
  blockId: string
}

function requireBand(doc: IDocument, band: IBandName): void {
  if (!doc || !doc.bands) throw new Error('a document with bands is required')
  if (!doc.bands[band]) throw new Error(`unknown band "${band}"`)
}

function cloneDoc(doc: IDocument): IDocument {
  return structuredClone(doc)
}

export function bandBoxOf(doc: IDocument, band: IBandName): IBandBox {
  requireBand(doc, band)
  return { widthMm: usableWidthMm(doc.page), heightMm: doc.bands[band].heightMm }
}

export function findBlock(doc: IDocument, band: IBandName, blockId: string): IBlock | null {
  requireBand(doc, band)
  return doc.bands[band].blocks.find((block) => block.id === blockId) ?? null
}

function withBlock(
  doc: IDocument,
  band: IBandName,
  blockId: string,
  change: (block: IBlock) => void,
): IDocument {
  requireBand(doc, band)
  if (!blockId) throw new Error('a block id is required')
  const next = cloneDoc(doc)
  const block = next.bands[band].blocks.find((candidate) => candidate.id === blockId)
  if (!block) throw new Error(`block "${blockId}" is not in band "${band}"`)
  change(block)
  return next
}

export function setBlockRect(
  doc: IDocument,
  band: IBandName,
  blockId: string,
  rect: IRect,
): IDocument {
  const bounded = clampRect(rect, bandBoxOf(doc, band))
  return withBlock(doc, band, blockId, (block) => Object.assign(block, bounded))
}

export function setBlockProp(
  doc: IDocument,
  band: IBandName,
  blockId: string,
  propName: string,
  value: IPropValue,
): IDocument {
  if (!propName) throw new Error('a property name is required')
  return withBlock(doc, band, blockId, (block) => {
    block.props = { ...block.props, [propName]: value }
  })
}

export function addBlock(doc: IDocument, band: IBandName, kind: string): IAddedBlock {
  requireBand(doc, band)
  if (!kind) throw new Error('a block kind is required')
  const block = applyDefaults(kind)
  const next = cloneDoc(doc)
  const bounded = clampRect(block, bandBoxOf(doc, band))
  next.bands[band].blocks = [...next.bands[band].blocks, { ...block, ...bounded }]
  return { doc: next, blockId: block.id }
}

export function removeBlock(doc: IDocument, band: IBandName, blockId: string): IDocument {
  requireBand(doc, band)
  if (!blockId) throw new Error('a block id is required')
  const next = cloneDoc(doc)
  next.bands[band].blocks = next.bands[band].blocks.filter((block) => block.id !== blockId)
  return next
}

export function setBandHeight(doc: IDocument, band: IBandName, heightMm: number): IDocument {
  requireBand(doc, band)
  if (!Number.isFinite(heightMm) || heightMm <= 0) {
    throw new Error('a band height must be a positive number of millimetres')
  }
  const next = cloneDoc(doc)
  next.bands[band].heightMm = heightMm
  const box = { widthMm: usableWidthMm(next.page), heightMm }
  next.bands[band].blocks = next.bands[band].blocks.map((block) => ({
    ...block,
    ...clampRect(block, box),
  }))
  return next
}

export function applyPropChange(
  doc: IDocument,
  band: IBandName,
  blockId: string,
  propName: string,
  value: IPropValue,
): IDocument {
  const next = setBlockProp(doc, band, blockId, propName, value)
  if (!value || typeof value !== 'object' || !('fragments' in value)) return next
  return value.fragments.reduce(
    (current, fragment) =>
      fragment.type === 'binding' && fragment.path
        ? declareDataPath(current, fragment.path)
        : current,
    next,
  )
}

export function setThemeToken(doc: IDocument, token: string, value: IThemeValue): IDocument {
  if (!token) throw new Error('a theme token is required')
  if (!doc || !doc.theme) throw new Error('a document with a theme is required')
  const next = cloneDoc(doc)
  next.theme = { ...next.theme, [token]: value }
  return next
}

export function declareDataPath(doc: IDocument, path: string): IDocument {
  if (!path) throw new Error('a data path is required')
  if (doc.dataSchema.some((entry) => entry.path === path)) return doc
  const next = cloneDoc(doc)
  next.dataSchema = [...next.dataSchema, { path, type: 'string', required: false }]
  return next
}
