import type { VNode } from '@wabot-dev/framework/ui'
import type { IBlock, ITheme } from '../document'
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
  | `enum:${string}`

export type IBlockSchema = Record<string, IPropType>

export interface IBlockDefinition {
  kind: string
  schema: IBlockSchema
  defaults: Omit<IBlock, 'id' | 'kind'>
  render: IBlockRender
  Inspector?: unknown
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
