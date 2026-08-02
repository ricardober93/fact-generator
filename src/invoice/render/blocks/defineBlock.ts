import type { VNode } from '@wabot-dev/framework/ui'
import {
  BAND_NAMES,
  type IBandName,
  type IBlock,
  type IDocument,
  type IPropValue,
  type ITheme,
} from '../document'
import type { IResolved } from '../bind'
import type { IFormatOptions } from '../format'

export interface IRenderContext {
  theme: ITheme
  format: IFormatOptions
  resolve: (path: string) => IResolved
  asset: (id: string) => string | null
}

export type IBlockRender = (block: IBlock, ctx: IRenderContext) => VNode | null

export type IPropType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'token'
  | 'asset'
  | 'text'
  | 'cells'
  | `enum:${string}`

export type IBlockSchema = Record<string, IPropType>

export interface IInspectorProps {
  block: IBlock
  doc: IDocument
  onChange: (propName: string, value: IPropValue) => void
}

export type IBlockInspector = (props: IInspectorProps) => VNode | null

export interface IBlockDefinition {
  kind: string
  schema: IBlockSchema
  defaults: Omit<IBlock, 'id' | 'kind'>
  render: IBlockRender
  Inspector?: IBlockInspector
  bands?: IBandName[]
  renderHeader?: IBlockRender
}

function assertBands(kind: string, bands: IBandName[]): void {
  if (bands.length === 0) {
    throw new Error(`defineBlock(${kind}): bands must not be empty`)
  }
  for (const band of bands) {
    if (!(BAND_NAMES as readonly string[]).includes(band)) {
      throw new Error(`defineBlock(${kind}): unknown band "${band}"`)
    }
  }
}

export function defineBlock(definition: IBlockDefinition): IBlockDefinition {
  if (!definition.kind) {
    throw new Error('defineBlock requires a non-empty kind')
  }
  if (!definition.schema) {
    throw new Error(`defineBlock(${definition.kind}) requires a schema`)
  }
  if (!definition.defaults) {
    throw new Error(`defineBlock(${definition.kind}) requires defaults`)
  }
  if (definition.bands) assertBands(definition.kind, definition.bands)
  for (const propName of Object.keys(definition.defaults.props)) {
    if (!(propName in definition.schema)) {
      throw new Error(
        `defineBlock(${definition.kind}): default prop "${propName}" is not in the schema`,
      )
    }
  }
  return definition
}

export function enumValues(propType: IPropType): string[] {
  if (!propType.startsWith('enum:')) return []
  return propType.slice('enum:'.length).split(',')
}
