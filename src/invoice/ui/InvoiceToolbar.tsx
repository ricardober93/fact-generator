import type { VNode } from '@wabot-dev/framework/ui'
import { SignOutButton } from '../../auth/ui/SignOutButton'

export interface ITemplateChoice {
  id: string
  name: string
}

export interface IMismatch {
  missing: string[]
  orphan: string[]
}

function MismatchNotice({ mismatch }: { mismatch: IMismatch }): VNode | null {
  const total = mismatch.missing.length + mismatch.orphan.length
  if (total === 0) return null
  return (
    <details class="wb-invoice-mismatch" data-mismatch={total}>
      <summary>Los datos no encajan del todo con el diseño</summary>
      {mismatch.missing.length > 0 ? (
        <p>
          El diseño pide y la factura no tiene:{' '}
          <span class="mono">{mismatch.missing.join(', ')}</span>
        </p>
      ) : null}
      {mismatch.orphan.length > 0 ? (
        <p>
          La factura guarda y el diseño ya no usa:{' '}
          <span class="mono">{mismatch.orphan.join(', ')}</span>
        </p>
      ) : null}
    </details>
  )
}

export function InvoiceToolbar({
  templates,
  templateId,
  status,
  duplicate,
  mismatch,
  onTemplate,
  onSave,
}: {
  templates: ITemplateChoice[]
  templateId: string
  status: string
  duplicate: boolean
  mismatch: IMismatch
  onTemplate: (id: string) => void
  onSave: () => void
}): VNode {
  return (
    <header class="wb-invoice-toolbar">
      <a class="btn btn-ghost btn-sm" href="/invoices">
        Facturas
      </a>
      <label class="wb-visually-hidden" for="invoice-template">
        Diseño
      </label>
      <select
        id="invoice-template"
        class="btn btn-secondary btn-sm"
        data-action="template"
        value={templateId}
        onChange={(event) => onTemplate((event.currentTarget as HTMLSelectElement).value)}
      >
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </select>
      <MismatchNotice mismatch={mismatch} />
      <span class="wb-toolbar-gap" />
      {duplicate ? (
        <span class="badge badge-warning" data-duplicate="true">
          Número repetido
        </span>
      ) : null}
      {status ? <span class="badge">{status}</span> : null}
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        data-action="print"
        onClick={() => window.print()}
      >
        Imprimir
      </button>
      <button type="button" class="btn btn-sm" data-action="save" onClick={onSave}>
        Guardar
      </button>
      <SignOutButton />
    </header>
  )
}
