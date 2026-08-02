import type { VNode } from '@wabot-dev/framework/ui'
import {
  BAND_NAMES,
  isCellList,
  isTextContent,
  type IBandName,
  type IBlock,
} from '../render/document'
import { reorderBlock } from './arrange'
import { removeBlocks } from './documentEdits'
import { selectedBand, selectedBlockIds, type IEditorStore } from './editorStore'
import { ArrowDownIcon, ArrowUpIcon, CloseIcon } from './icons'

export const BAND_LABELS: Record<IBandName, string> = {
  header: 'Cabecera',
  detailHeader: 'Cabecera de detalle',
  detail: 'Detalle',
  summary: 'Totales',
  pageFooter: 'Pie de página',
}

function excerptOf(block: IBlock): string {
  const content = block.props.content
  if (isTextContent(content)) {
    const literal = content.fragments.find((fragment) => fragment.type === 'literal')
    if (literal && literal.type === 'literal' && literal.text) return literal.text
    const binding = content.fragments.find((fragment) => fragment.type === 'binding')
    if (binding && binding.type === 'binding') return binding.path
  }
  const cells = block.props.cells
  if (isCellList(cells) && cells.length > 0) return cells.map((cell) => cell.label).join(' · ')
  return ''
}

function LayerRow({
  store,
  band,
  block,
  index,
}: {
  store: IEditorStore
  band: IBandName
  block: IBlock
  index: number
}): VNode {
  const doc = store.doc.value
  const selected = selectedBlockIds(store).includes(block.id)
  const excerpt = excerptOf(block)
  return (
    <li class="wb-layer" data-layer={block.id} data-selected={selected ? 'true' : 'false'}>
      <button
        type="button"
        class="btn btn-ghost btn-sm wb-layer-name"
        onClick={() => store.select(band, [block.id])}
      >
        <span class="wb-layer-kind">{block.kind}</span>
        {excerpt ? <span class="muted">{excerpt}</span> : null}
      </button>
      <button
        type="button"
        class="wb-icon-button"
        aria-label={`Subir ${block.kind}`}
        onClick={() => store.commit(reorderBlock(doc, band, block.id, index + 1))}
      >
        <ArrowUpIcon />
      </button>
      <button
        type="button"
        class="wb-icon-button"
        aria-label={`Bajar ${block.kind}`}
        onClick={() => store.commit(reorderBlock(doc, band, block.id, index - 1))}
      >
        <ArrowDownIcon />
      </button>
      <button
        type="button"
        class="wb-icon-button"
        aria-label={`Borrar ${block.kind}`}
        onClick={() => {
          store.commit(removeBlocks(doc, band, [block.id]))
          store.select(band, [])
        }}
      >
        <CloseIcon />
      </button>
    </li>
  )
}

interface ILayerEntry {
  block: IBlock
  index: number
}

function entriesOf(blocks: IBlock[], decorative: boolean): ILayerEntry[] {
  return blocks
    .map((block, index) => ({ block, index }))
    .filter((entry) => Boolean(entry.block.decorative) === decorative)
}

function DecorationGroup({
  store,
  band,
  entries,
}: {
  store: IEditorStore
  band: IBandName
  entries: ILayerEntry[]
}): VNode | null {
  if (entries.length === 0) return null
  return (
    <details class="wb-layer-group" data-decoration-group={entries.length}>
      <summary>Decoración ({entries.length})</summary>
      <ul class="wb-layers">
        {entries.map(({ block, index }) => (
          <LayerRow key={block.id} store={store} band={band} block={block} index={index} />
        ))}
      </ul>
    </details>
  )
}

export function LayersPanel({ store }: { store: IEditorStore }): VNode {
  const band = selectedBand(store)
  const blocks = band ? store.doc.value.bands[band].blocks : []
  return (
    <aside class="stack">
      <fieldset class="stack-sm">
        <legend>Banda</legend>
        <div class="wb-bands">
          {BAND_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              class={`btn btn-sm ${band === name ? '' : 'btn-secondary'}`}
              aria-pressed={band === name}
              data-band-tab={name}
              onClick={() => store.select(name, [])}
            >
              {BAND_LABELS[name]}
            </button>
          ))}
        </div>
      </fieldset>

      {band ? (
        <fieldset class="stack-sm">
          <legend>Capas</legend>
          {blocks.length === 0 ? <p class="muted">Banda vacía.</p> : null}
          <ul class="wb-layers">
            {entriesOf(blocks, false).map(({ block, index }) => (
              <LayerRow key={block.id} store={store} band={band} block={block} index={index} />
            ))}
          </ul>
          <DecorationGroup store={store} band={band} entries={entriesOf(blocks, true)} />
        </fieldset>
      ) : null}
    </aside>
  )
}
