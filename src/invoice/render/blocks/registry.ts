import type { IBlock } from '../document'
import type { IBlockDefinition } from './defineBlock'
import boxBlock from './box'
import imageBlock from './image'
import lineBlock from './line'
import textBlock from './text'

const DEFINITIONS: IBlockDefinition[] = [textBlock, imageBlock, boxBlock, lineBlock]

const BY_KIND = new Map<string, IBlockDefinition>(
  DEFINITIONS.map((definition) => [definition.kind, definition]),
)

export function blockKinds(): string[] {
  return [...BY_KIND.keys()]
}

export function findBlockDefinition(kind: string): IBlockDefinition | null {
  if (typeof kind !== 'string') return null
  return BY_KIND.get(kind) ?? null
}

export function applyDefaults(kind: string, partial: Partial<IBlock> = {}): IBlock {
  const definition = findBlockDefinition(kind)
  if (!definition) {
    throw new Error(`Unknown block kind "${kind}"`)
  }
  const { defaults } = definition
  return {
    id: partial.id ?? crypto.randomUUID(),
    kind,
    xMm: partial.xMm ?? defaults.xMm,
    yMm: partial.yMm ?? defaults.yMm,
    widthMm: partial.widthMm ?? defaults.widthMm,
    heightMm: partial.heightMm ?? defaults.heightMm,
    props: { ...defaults.props, ...(partial.props ?? {}) },
  }
}
