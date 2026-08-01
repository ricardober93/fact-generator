import type { AssetRepository } from './models/asset/AssetRepository'
import { findBlockDefinition } from './render/blocks/registry'
import { isTokenReference, tokenName, type IDocument } from './render/document'
import { resolveTheme } from './render/theme'

export function referencedAssetTokens(doc: IDocument): string[] {
  const tokens = new Set<string>()
  for (const band of Object.values(doc.bands)) {
    for (const block of band.blocks) {
      const definition = findBlockDefinition(block.kind)
      if (!definition) continue
      for (const [propName, propType] of Object.entries(definition.schema)) {
        if (propType !== 'asset') continue
        const reference = block.props[propName]
        if (isTokenReference(reference)) tokens.add(tokenName(reference))
      }
    }
  }
  return [...tokens]
}

export async function assetsFor(
  doc: IDocument,
  repository: AssetRepository,
  params: Record<string, unknown> = {},
): Promise<Record<string, string>> {
  if (!doc) {
    throw new Error('assetsFor requires a document')
  }
  const theme = resolveTheme(doc, params)
  const idByToken = new Map<string, string>()
  for (const token of referencedAssetTokens(doc)) {
    const assetId = theme[token]
    if (typeof assetId === 'string' && assetId.length > 0) idByToken.set(token, assetId)
  }
  if (idByToken.size === 0) return {}
  const assets = await repository.findByIds([...new Set(idByToken.values())])
  const uriById = new Map(assets.map((asset) => [asset.id, asset.toDataUri()]))
  const byToken: Record<string, string> = {}
  for (const [token, assetId] of idByToken) {
    const uri = uriById.get(assetId)
    if (uri) byToken[token] = uri
  }
  return byToken
}
