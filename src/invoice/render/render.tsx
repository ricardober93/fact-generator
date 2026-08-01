import type { VNode } from '@wabot-dev/framework/ui'
import { missingRequiredPaths, resolveInScope, type IBindingScope } from './bind'
import { renderBand, renderDetailTable, renderPageFooter } from './bands'
import { DETAIL_ITEM_ROOT, usableWidthMm, type IDocument } from './document'
import type { IRenderContext } from './blocks/defineBlock'
import { formatOptionsOf } from './format'
import { pageCss, themeStyle } from './printCss'
import { resolveTheme } from './theme'

export interface IRenderInput {
  doc: IDocument
  data?: Record<string, unknown>
  items?: unknown[]
  params?: Record<string, unknown>
  assets?: Record<string, string>
}

export class MissingDataError extends Error {
  constructor(readonly paths: string[]) {
    super(`Missing required data: ${paths.join(', ')}`)
    this.name = 'MissingDataError'
  }
}

function contextOf(input: IRenderInput, item: unknown | undefined): IRenderContext {
  const theme = resolveTheme(input.doc, input.params ?? {})
  const scope: IBindingScope = {
    data: input.data ?? {},
    item,
    itemRoot: DETAIL_ITEM_ROOT,
  }
  return {
    theme,
    format: formatOptionsOf(input.doc, theme),
    resolve: (path) => resolveInScope(scope, path),
    asset: (id) => input.assets?.[id] ?? null,
  }
}

export function render(input: IRenderInput): VNode {
  if (!input || !input.doc) {
    throw new Error('render requires a document')
  }
  const { doc } = input
  const items = input.items ?? []
  const missing = missingRequiredPaths(doc, input.data ?? {}, items, DETAIL_ITEM_ROOT)
  if (missing.length > 0) {
    throw new MissingDataError(missing)
  }
  const ctx = contextOf(input, undefined)
  return (
    <div
      style={{
        ...themeStyle(ctx.theme),
        width: `${usableWidthMm(doc.page)}mm`,
        margin: '0 auto',
        position: 'relative',
      }}
    >
      <style>{pageCss(doc.page)}</style>
      {renderBand(doc.bands.header, 'header', ctx)}
      {renderDetailTable(doc, items, (item) => contextOf(input, item))}
      {renderBand(doc.bands.summary, 'summary', ctx)}
      {renderPageFooter(doc.bands.pageFooter, ctx)}
    </div>
  )
}
