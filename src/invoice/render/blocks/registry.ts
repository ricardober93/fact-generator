import { BAND_NAMES, type IBandName, type IBlock, type IDocument } from '../document'
import type { IBlockDefinition } from './defineBlock'
import boxBlock from './box'
import imageBlock from './image'
import lineBlock from './line'
import listBlock from './list'
import tableBlock from './table'
import textBlock from './text'

const DEFINITIONS: IBlockDefinition[] = [
  textBlock,
  imageBlock,
  boxBlock,
  lineBlock,
  tableBlock,
  listBlock,
]

const BY_KIND = new Map<string, IBlockDefinition>(
  DEFINITIONS.map((definition) => [definition.kind, definition]),
)

export function blockKinds(): string[] {
  return [...BY_KIND.keys()]
}

export function acceptsBand(definition: IBlockDefinition, band: IBandName): boolean {
  if (!definition) throw new Error('acceptsBand requires a block definition')
  return !definition.bands || definition.bands.includes(band)
}

export function blockKindsForBand(band: IBandName): string[] {
  if (!(BAND_NAMES as readonly string[]).includes(band)) {
    throw new Error(`blockKindsForBand requires a known band, got "${band}"`)
  }
  return DEFINITIONS.filter((definition) => acceptsBand(definition, band)).map(
    (definition) => definition.kind,
  )
}

export function findBlockDefinition(kind: string): IBlockDefinition | null {
  if (typeof kind !== 'string') return null
  return BY_KIND.get(kind) ?? null
}

export function withBlockDefaults(doc: IDocument): IDocument {
  if (!doc || !doc.bands) throw new Error('withBlockDefaults requires a document')
  const bands = {} as IDocument['bands']
  for (const band of BAND_NAMES) {
    const stored = doc.bands[band]
    bands[band] = { ...stored, blocks: stored.blocks.map(blockWithDefaults) }
  }
  return { ...doc, bands }
}

function blockWithDefaults(block: IBlock): IBlock {
  if (!findBlockDefinition(block.kind)) return block
  return applyDefaults(block.kind, block)
}

export function applyDefaults(kind: string, partial: Partial<IBlock> = {}): IBlock {
  const definition = findBlockDefinition(kind)
  if (!definition) {
    throw new Error(`Unknown block kind "${kind}"`)
  }
  const { defaults } = definition
  const block: IBlock = {
    id: partial.id ?? crypto.randomUUID(),
    kind,
    xMm: partial.xMm ?? defaults.xMm,
    yMm: partial.yMm ?? defaults.yMm,
    widthMm: partial.widthMm ?? defaults.widthMm,
    heightMm: partial.heightMm ?? defaults.heightMm,
    props: { ...defaults.props, ...(partial.props ?? {}) },
  }
  if (partial.decorative) block.decorative = true
  return block
}
