import type { VNode } from '@wabot-dev/framework/ui'
import { CELL_ALIGNS, type ICell, type IDocument } from '../render/document'
import { FORMATS } from '../render/format'
import { ArrowDownIcon, ArrowUpIcon, CloseIcon } from './icons'

export interface ICellsEditorProps {
  cells: ICell[]
  doc: IDocument
  widthMm: number
  onChange: (cells: ICell[]) => void
}

const NEW_CELL: ICell = { label: 'Columna', path: '', widthMm: 30, align: 'left' }

const PATHS_LIST_ID = 'cells-data-paths'

export function movedCell(cells: ICell[], from: number, to: number): ICell[] {
  if (to < 0 || to >= cells.length) return cells
  const next = [...cells]
  const [cell] = next.splice(from, 1)
  next.splice(to, 0, cell)
  return next
}

function CellRow({
  cell,
  index,
  cells,
  onChange,
}: {
  cell: ICell
  index: number
  cells: ICell[]
  onChange: (cells: ICell[]) => void
}): VNode {
  function update(patch: Partial<ICell>): void {
    onChange(
      cells.map((current, position) => (position === index ? { ...current, ...patch } : current)),
    )
  }

  return (
    <li class="wb-cell" data-cell={index}>
      <input
        type="text"
        aria-label={`Etiqueta de la celda ${index + 1}`}
        data-cell-label={index}
        value={cell.label}
        onInput={(event) => update({ label: (event.currentTarget as HTMLInputElement).value })}
      />
      <input
        type="text"
        list={PATHS_LIST_ID}
        aria-label={`Ruta de la celda ${index + 1}`}
        data-cell-path={index}
        value={cell.path}
        onInput={(event) => update({ path: (event.currentTarget as HTMLInputElement).value })}
      />
      <select
        aria-label={`Formato de la celda ${index + 1}`}
        data-cell-format={index}
        value={cell.format ?? ''}
        onChange={(event) => {
          const value = (event.currentTarget as HTMLSelectElement).value
          update({ format: value ? value : undefined })
        }}
      >
        <option value="">Sin formato</option>
        {FORMATS.map((format) => (
          <option key={format} value={format}>
            {format}
          </option>
        ))}
      </select>
      <input
        type="number"
        step="any"
        aria-label={`Ancho de la celda ${index + 1}`}
        data-cell-width={index}
        value={cell.widthMm}
        onInput={(event) => {
          const parsed = Number((event.currentTarget as HTMLInputElement).value)
          if (Number.isFinite(parsed) && parsed > 0) update({ widthMm: parsed })
        }}
      />
      <select
        aria-label={`Alineación de la celda ${index + 1}`}
        data-cell-align={index}
        value={cell.align}
        onChange={(event) =>
          update({ align: (event.currentTarget as HTMLSelectElement).value as ICell['align'] })
        }
      >
        {CELL_ALIGNS.map((align) => (
          <option key={align} value={align}>
            {align}
          </option>
        ))}
      </select>
      <div class="wb-cell-actions">
        <button
          type="button"
          class="wb-icon-button"
          aria-label={`Subir la celda ${index + 1}`}
          onClick={() => onChange(movedCell(cells, index, index - 1))}
        >
          <ArrowUpIcon />
        </button>
        <button
          type="button"
          class="wb-icon-button"
          aria-label={`Bajar la celda ${index + 1}`}
          onClick={() => onChange(movedCell(cells, index, index + 1))}
        >
          <ArrowDownIcon />
        </button>
        <button
          type="button"
          class="wb-icon-button"
          aria-label={`Borrar la celda ${index + 1}`}
          onClick={() => onChange(cells.filter((_, position) => position !== index))}
        >
          <CloseIcon />
        </button>
      </div>
    </li>
  )
}

export function CellsEditor({ cells, doc, widthMm, onChange }: ICellsEditorProps): VNode {
  const usedMm = cells.reduce((sum, cell) => sum + cell.widthMm, 0)
  return (
    <div class="stack-sm">
      <datalist id={PATHS_LIST_ID}>
        {doc.dataSchema.map((entry) => (
          <option key={entry.path} value={entry.path} />
        ))}
      </datalist>
      <ul class="wb-cells">
        {cells.map((cell, index) => (
          <CellRow key={index} cell={cell} index={index} cells={cells} onChange={onChange} />
        ))}
      </ul>
      <p class={usedMm > widthMm ? 'badge badge-warning' : 'faint'} data-cells-width={usedMm}>
        {usedMm} mm de {widthMm} mm
      </p>
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        data-add-cell="true"
        onClick={() => onChange([...cells, { ...NEW_CELL }])}
      >
        Añadir celda
      </button>
    </div>
  )
}
