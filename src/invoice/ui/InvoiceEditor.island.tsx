import {
  actionUrl,
  callAction,
  island,
  useComputed,
  useSignal,
  type VNode,
} from '@wabot-dev/framework/ui'
import type { IDocument } from '../render/document'
import type { ICorrectedDocument } from '../models/invoice/Invoice'
import type { IDocType } from '../models/docType'
import { InvoiceFields } from './InvoiceFields'
import { InvoiceLines, type ICatalogChoice } from './InvoiceLines'
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
import { issuedMessage, issueRefusal } from './issueOutcome'
import { nextSaveState, type ISaveReply } from './saveOutcome'
import type { IIssueInvoiceReply } from '../InvoiceDtos'

const SAVE_URL = actionUrl('/invoices', 'save')
const ISSUE_URL = actionUrl('/invoices', 'issue')
const CATALOG_URL = actionUrl('/invoices', 'searchCatalog')
const DOCUMENT_URL = actionUrl('/invoices', 'document')

export interface IInvoiceEditorProps {
  id: string | null
  rev: number
  issued: boolean
  numero: string
  docType: IDocType
  catalogEnabled: boolean
  correctionReason: string
  corrects: ICorrectedDocument | null
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
  const issued = useSignal(props.issued)
  const numero = useSignal(props.numero)
  const reason = useSignal(props.correctionReason)
  const catalogText = useSignal('')
  const catalogItems = useSignal<ICatalogChoice[]>([])
  const catalogNotice = useSignal('')
  const isCreditNote = props.docType === 'notaCredito'
  const blocked = useComputed(() => issued.value && props.mismatch.missing.length > 0)
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
        correctionReason: isCreditNote ? reason.value : undefined,
      })
      const next = nextSaveState(
        { id: invoiceId.value, rev: rev.value, status: status.value },
        result,
      )
      invoiceId.value = next.id
      rev.value = next.rev
      status.value = next.status
    } catch (error) {
      status.value = error instanceof Error ? error.message : 'No se pudo guardar'
    }
  }

  async function searchCatalog(): Promise<void> {
    catalogNotice.value = ''
    try {
      const result = await callAction<{ items: ICatalogChoice[] }>(CATALOG_URL, {
        text: catalogText.value,
      })
      catalogItems.value = result.items
      if (result.items.length === 0) {
        catalogNotice.value = 'El catálogo no devolvió nada. Puedes escribir la línea a mano.'
      }
    } catch {
      catalogItems.value = []
      catalogNotice.value = 'El catálogo no está disponible. Puedes escribir la línea a mano.'
    }
  }

  function pickFromCatalog(item: ICatalogChoice): void {
    const line = withLineAmount({
      ref: item.ref,
      descripcion: item.label,
      cantidad: 1,
      precio: item.unitPrice,
    })
    changeLines([...items.value, line])
    catalogItems.value = []
    catalogText.value = ''
  }

  async function issue(): Promise<void> {
    if (!invoiceId.value) {
      status.value = 'Guarda la factura antes de emitirla.'
      return
    }
    status.value = 'Emitiendo'
    try {
      const result = await callAction<IIssueInvoiceReply>(ISSUE_URL, { id: invoiceId.value })
      if (result.status !== 'issued') {
        status.value = issueRefusal(result.reason, result.issues)
        return
      }
      issued.value = true
      numero.value = result.numero
      rev.value = result.rev
      status.value = issuedMessage(result.numero)
    } catch (error) {
      status.value = error instanceof Error ? error.message : 'No se pudo emitir'
    }
  }

  return (
    <div class="wb-invoice-shell" data-print-blocked={blocked.value ? 'true' : undefined}>
      <InvoiceToolbar
        templates={props.templates}
        templateId={templateId.value}
        status={status.value}
        mismatch={props.mismatch}
        issued={issued.value}
        numero={numero.value}
        canPrint={!blocked.value}
        canCorrect={issued.value && props.docType === 'factura'}
        invoiceId={invoiceId.value}
        onTemplate={changeTemplate}
        onSave={save}
        onIssue={issue}
      />
      {props.corrects ? (
        <p class="wb-correction-note" data-corrects={props.corrects.id}>
          Corrige la factura{' '}
          <a href={`/invoices/${props.corrects.id}`}>
            {props.corrects.prefix}
            {props.corrects.number}
          </a>
        </p>
      ) : null}
      <div class="wb-invoice-body">
        <form class="wb-invoice-form stack" onSubmit={(event) => event.preventDefault()}>
          <fieldset class="wb-invoice-fieldset" disabled={issued.value}>
            {isCreditNote ? (
              <div class="stack-sm" data-correction-reason="true">
                <label for="invoice-reason">Motivo (obligatorio)</label>
                <textarea
                  id="invoice-reason"
                  name="correctionReason"
                  rows={2}
                  required
                  value={reason.value}
                  onInput={(event) =>
                    (reason.value = (event.currentTarget as HTMLTextAreaElement).value)
                  }
                />
              </div>
            ) : null}
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
              catalog={{
                enabled: props.catalogEnabled,
                text: catalogText.value,
                results: catalogItems.value,
                notice: catalogNotice.value,
                onText: (value) => (catalogText.value = value),
                onSearch: searchCatalog,
                onPick: pickFromCatalog,
              }}
            />
          </fieldset>
        </form>
        {blocked.value ? (
          <div class="wb-print-blocked" data-print-blocked="true">
            <p>
              Esta factura está emitida y le faltan datos que su plantilla declara obligatorios. No
              se puede imprimir hasta que la plantilla vuelva a cubrirlos:
            </p>
            <ul>
              {props.mismatch.missing.map((path) => (
                <li key={path} class="mono">
                  {path}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
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
