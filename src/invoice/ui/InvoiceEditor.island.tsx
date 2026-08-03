import {
  actionUrl,
  callAction,
  island,
  useComputed,
  useSignal,
  type VNode,
} from '@wabot-dev/framework/ui'
import type { IDocument } from '../render/document'
import { InvoiceFields } from './InvoiceFields'
import { InvoiceLines } from './InvoiceLines'
import { InvoicePaper } from './InvoicePaper'
import { InvoiceToolbar, type ITemplateChoice } from './InvoiceToolbar'
import {
  applyFieldChange,
  addLine,
  moveLine,
  readPath,
  removeLine,
  withLineAmount,
  withTotals,
  type IFormRecord,
  type IFormValue,
} from './invoiceEdits'
import { formShapeOf } from './invoiceForm'
import { nextSaveState, type ISaveReply } from './saveOutcome'

const SAVE_URL = actionUrl('/invoices', 'save')
const DOCUMENT_URL = actionUrl('/invoices', 'document')

export interface IInvoiceEditorProps {
  id: string | null
  rev: number
  templateId: string
  doc: IDocument
  data: IFormRecord
  items: IFormRecord[]
  params: Record<string, string>
  assets: Record<string, string>
  templates: ITemplateChoice[]
  mismatch: { missing: string[]; orphan: string[] }
}

function InvoiceEditor(props: IInvoiceEditorProps): VNode {
  const templateId = useSignal(props.templateId)
  const doc = useSignal(props.doc)
  const assets = useSignal(props.assets)
  const data = useSignal(props.data)
  const items = useSignal(props.items)
  const invoiceId = useSignal(props.id)
  const rev = useSignal(props.rev)
  const status = useSignal('')
  const duplicate = useSignal(false)
  const shape = useComputed(() => formShapeOf(doc.value))

  function changeField(path: string, value: IFormValue): void {
    data.value = applyFieldChange(data.value, items.value, path, value)
  }

  function changeCell(index: number, key: string, value: IFormValue): void {
    const next = items.value.map((item, position) =>
      position === index ? withLineAmount({ ...item, [key]: value }) : item,
    )
    items.value = next
    data.value = withTotals(data.value, next)
  }

  function changeLines(next: IFormRecord[]): void {
    items.value = next
    data.value = withTotals(data.value, next)
  }

  async function changeTemplate(nextId: string): Promise<void> {
    if (!nextId || nextId === templateId.value) return
    const result = await callAction<{ doc: IDocument; assets: Record<string, string> }>(
      DOCUMENT_URL,
      { id: nextId },
    )
    templateId.value = nextId
    doc.value = result.doc
    assets.value = result.assets
  }

  async function save(): Promise<void> {
    status.value = 'Guardando'
    try {
      const result = await callAction<ISaveReply>(SAVE_URL, {
        id: invoiceId.value,
        rev: rev.value,
        templateId: templateId.value,
        data: data.value,
        items: items.value,
        params: props.params,
      })
      const next = nextSaveState(
        {
          id: invoiceId.value,
          rev: rev.value,
          status: status.value,
          duplicate: duplicate.value,
        },
        result,
      )
      invoiceId.value = next.id
      rev.value = next.rev
      duplicate.value = next.duplicate
      status.value = next.status
    } catch (error) {
      status.value = error instanceof Error ? error.message : 'No se pudo guardar'
    }
  }

  return (
    <div class="wb-invoice-shell">
      <InvoiceToolbar
        templates={props.templates}
        templateId={templateId.value}
        status={status.value}
        duplicate={duplicate.value}
        mismatch={props.mismatch}
        onTemplate={changeTemplate}
        onSave={save}
      />
      <div class="wb-invoice-body">
        <form class="wb-invoice-form stack" onSubmit={(event) => event.preventDefault()}>
          <InvoiceFields
            groups={shape.value.groups}
            read={(path) => readPath(data.value, path)}
            onChange={changeField}
          />
          <InvoiceLines
            columns={shape.value.columns}
            items={items.value}
            onCell={changeCell}
            onMove={(index, target) => changeLines(moveLine(items.value, index, target))}
            onRemove={(index) => changeLines(removeLine(items.value, index))}
            onAdd={() => changeLines(addLine(items.value))}
          />
        </form>
        <div class="wb-invoice-stage">
          <InvoicePaper
            doc={doc.value}
            data={data.value}
            items={items.value}
            params={props.params}
            assets={assets.value}
          />
        </div>
      </div>
    </div>
  )
}

export default island(InvoiceEditor)
