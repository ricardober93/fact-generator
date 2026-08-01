import type { VNode } from '@wabot-dev/framework/ui'
import type { IBand, IBlock, IDocument } from './document'
import type { IRenderContext } from './blocks/defineBlock'
import { findBlockDefinition } from './blocks/registry'

export function renderBlock(block: IBlock, ctx: IRenderContext): VNode {
  const definition = findBlockDefinition(block.kind)
  if (!definition) {
    throw new Error(`Cannot render unknown block kind "${block.kind}"`)
  }
  return (
    <div
      style={{
        position: 'absolute',
        left: `${block.xMm}mm`,
        top: `${block.yMm}mm`,
        width: `${block.widthMm}mm`,
        height: `${block.heightMm}mm`,
      }}
    >
      {definition.render(block, ctx)}
    </div>
  )
}

export function renderBand(band: IBand, ctx: IRenderContext): VNode {
  return (
    <div style={{ position: 'relative', height: `${band.heightMm}mm`, width: '100%' }}>
      {band.blocks.map((block) => renderBlock(block, ctx))}
    </div>
  )
}

export function renderDetailTable(
  doc: IDocument,
  items: unknown[],
  contextFor: (item: unknown | undefined) => IRenderContext,
): VNode {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <td style={{ padding: 0 }}>
            {renderBand(doc.bands.detailHeader, contextFor(undefined))}
          </td>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={index}>
            <td style={{ padding: 0 }}>{renderBand(doc.bands.detail, contextFor(item))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function renderPageFooter(band: IBand, ctx: IRenderContext): VNode {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: `${band.heightMm}mm`,
      }}
    >
      {renderBand(band, ctx)}
    </div>
  )
}
