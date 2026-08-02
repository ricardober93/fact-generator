import type { VNode } from '@wabot-dev/framework/ui'
import { completeItems } from '../render/dataFit'
import { usableWidthMm, type IDocument } from '../render/document'
import { MissingDataError, render } from '../render/render'

export interface IInvoicePaperProps {
  doc: IDocument
  data: Record<string, unknown>
  items: Record<string, unknown>[]
  params: Record<string, string>
  assets: Record<string, string>
}

function MissingNotice({ paths }: { paths: string[] }): VNode {
  return (
    <div class="wb-invoice-missing" data-missing={paths.length}>
      <p class="muted">Faltan datos obligatorios para pintar la factura:</p>
      <ul>
        {paths.map((path) => (
          <li key={path} class="mono">
            {path}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function InvoicePaper(props: IInvoicePaperProps): VNode {
  const { doc, data, items, params, assets } = props
  let painted: VNode | null = null
  let missing: string[] = []
  try {
    painted = render({ doc, data, items: completeItems(doc, items), params, assets })
  } catch (error) {
    if (!(error instanceof MissingDataError)) throw error
    missing = error.paths
  }
  return (
    <div class="wb-invoice-paper" data-invoice-paper="true">
      {painted ? (
        <div class="wb-paper" style={{ width: `${usableWidthMm(doc.page)}mm` }}>
          {painted}
        </div>
      ) : (
        <MissingNotice paths={missing} />
      )}
    </div>
  )
}
