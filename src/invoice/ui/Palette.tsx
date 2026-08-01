import { BAND_NAMES, type IBandName } from '../render/document'
import { blockKinds } from '../render/blocks/registry'
import { addBlock } from './documentEdits'
import type { IEditorStore } from './editorStore'

const BAND_LABELS: Record<IBandName, string> = {
  header: 'Cabecera',
  detailHeader: 'Cabecera de detalle',
  detail: 'Detalle',
  summary: 'Totales',
  pageFooter: 'Pie de página',
}

export function Palette({ store }: { store: IEditorStore }) {
  const band = store.selectedBand.value

  function insert(kind: string): void {
    if (!band) return
    const { doc, blockId } = addBlock(store.doc.value, band, kind)
    store.commit(doc)
    store.select(band, blockId)
  }

  return (
    <aside style={{ display: 'grid', gap: '12px', minWidth: 0 }}>
      <div>
        <h2 style={{ fontSize: '13px', margin: '0 0 6px' }}>Banda</h2>
        <select
          value={band ?? ''}
          onChange={(event) => {
            const chosen = (event.currentTarget as HTMLSelectElement).value
            store.select(chosen ? (chosen as IBandName) : null, null)
          }}
          style={{ width: '100%' }}
        >
          <option value="">Ninguna seleccionada</option>
          {BAND_NAMES.map((name) => (
            <option key={name} value={name}>
              {BAND_LABELS[name]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h2 style={{ fontSize: '13px', margin: '0 0 6px' }}>Bloques</h2>
        {!band && (
          <p style={{ fontSize: '12px', color: '#666', margin: '0 0 6px' }}>
            Selecciona una banda para insertar.
          </p>
        )}
        <div style={{ display: 'grid', gap: '4px' }}>
          {blockKinds().map((kind) => (
            <button
              key={kind}
              type="button"
              disabled={!band}
              data-palette-kind={kind}
              onClick={() => insert(kind)}
            >
              {kind}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
