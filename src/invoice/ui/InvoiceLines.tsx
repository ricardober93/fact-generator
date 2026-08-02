import type { VNode } from '@wabot-dev/framework/ui'
import type { IFormField } from './invoiceForm'
import type { IFormRecord, IFormValue } from './invoiceEdits'
import { ArrowDownIcon, ArrowUpIcon, CloseIcon } from './icons'

function valueOf(raw: unknown): string {
  return raw === undefined || raw === null ? '' : String(raw)
}

function readCell(column: IFormField, target: HTMLInputElement): IFormValue {
  if (column.type === 'number') return target.value === '' ? '' : Number(target.value)
  if (column.type === 'boolean') return target.checked
  return target.value
}

function LineRow({
  columns,
  item,
  index,
  total,
  onCell,
  onMove,
  onRemove,
}: {
  columns: IFormField[]
  item: IFormRecord
  index: number
  total: number
  onCell: (index: number, key: string, value: IFormValue) => void
  onMove: (index: number, target: number) => void
  onRemove: (index: number) => void
}): VNode {
  return (
    <tr data-line={index}>
      {columns.map((column) => (
        <td key={column.key}>
          <input
            aria-label={`${column.label} de la línea ${index + 1}`}
            data-cell={`${index}.${column.key}`}
            type={column.type === 'number' ? 'number' : 'text'}
            step="any"
            value={valueOf(item[column.key])}
            onInput={(event) =>
              onCell(index, column.key, readCell(column, event.currentTarget as HTMLInputElement))
            }
          />
        </td>
      ))}
      <td class="wb-line-actions">
        <button
          type="button"
          class="wb-icon-button"
          aria-label={`Subir la línea ${index + 1}`}
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
        >
          <ArrowUpIcon />
        </button>
        <button
          type="button"
          class="wb-icon-button"
          aria-label={`Bajar la línea ${index + 1}`}
          disabled={index === total - 1}
          onClick={() => onMove(index, index + 1)}
        >
          <ArrowDownIcon />
        </button>
        <button
          type="button"
          class="wb-icon-button"
          aria-label={`Quitar la línea ${index + 1}`}
          onClick={() => onRemove(index)}
        >
          <CloseIcon />
        </button>
      </td>
    </tr>
  )
}

export function InvoiceLines({
  columns,
  items,
  onCell,
  onMove,
  onRemove,
  onAdd,
}: {
  columns: IFormField[]
  items: IFormRecord[]
  onCell: (index: number, key: string, value: IFormValue) => void
  onMove: (index: number, target: number) => void
  onRemove: (index: number) => void
  onAdd: () => void
}): VNode {
  return (
    <fieldset class="stack-sm">
      <legend>Líneas</legend>
      {items.length === 0 ? <p class="muted">Todavía no hay líneas.</p> : null}
      {items.length > 0 ? (
        <table class="wb-invoice-lines">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <LineRow
                key={index}
                columns={columns}
                item={item}
                index={index}
                total={items.length}
                onCell={onCell}
                onMove={onMove}
                onRemove={onRemove}
              />
            ))}
          </tbody>
        </table>
      ) : null}
      <button type="button" class="btn btn-secondary btn-sm" data-action="add-line" onClick={onAdd}>
        Añadir línea
      </button>
    </fieldset>
  )
}
