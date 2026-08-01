import type { VNode } from '@wabot-dev/framework/ui'
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

export function Palette({ store }: { store: IEditorStore }): VNode {
  const band = store.selectedBand.value

  function insert(kind: string): void {
    if (!band) return
    const { doc, blockId } = addBlock(store.doc.value, band, kind)
    store.commit(doc)
    store.select(band, blockId)
  }

  return (
    <aside class="stack">
      <fieldset class="stack-sm">
        <legend>Banda</legend>
        <label for="editor-band">Banda activa</label>
        <select
          id="editor-band"
          value={band ?? ''}
          onChange={(event) => {
            const chosen = (event.currentTarget as HTMLSelectElement).value
            store.select(chosen ? (chosen as IBandName) : null, null)
          }}
        >
          <option value="">Ninguna</option>
          {BAND_NAMES.map((name) => (
            <option key={name} value={name}>
              {BAND_LABELS[name]}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset class="stack-sm">
        <legend>Bloques</legend>
        {!band ? <p class="muted">Elige una banda para insertar.</p> : null}
        <div class="wb-palette">
          {blockKinds().map((kind) => (
            <button
              key={kind}
              type="button"
              class="btn btn-secondary btn-sm"
              disabled={!band}
              data-palette-kind={kind}
              onClick={() => insert(kind)}
            >
              {kind}
            </button>
          ))}
        </div>
      </fieldset>
    </aside>
  )
}
