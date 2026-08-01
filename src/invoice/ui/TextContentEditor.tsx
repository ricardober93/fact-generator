import type { VNode } from '@wabot-dev/framework/ui'
import { FORMATS } from '../render/format'
import type { IDocument, ITextContent, ITextFragment, ITextMark } from '../render/document'
import { ArrowDownIcon, ArrowUpIcon, CloseIcon } from './icons'

const MARKS: Array<{ mark: ITextMark; label: string }> = [
  { mark: 'bold', label: 'Negrita' },
  { mark: 'italic', label: 'Cursiva' },
  { mark: 'underline', label: 'Subrayado' },
]

const DATA_PATHS_LIST = 'editor-data-paths'

export interface ITextContentEditorProps {
  content: ITextContent
  doc: IDocument
  onChange: (content: ITextContent) => void
}

function replaceAt(
  fragments: ITextFragment[],
  index: number,
  fragment: ITextFragment,
): ITextFragment[] {
  return fragments.map((current, position) => (position === index ? fragment : current))
}

function toggledMarks(fragment: ITextFragment, mark: ITextMark): ITextMark[] {
  const marks = fragment.marks ?? []
  return marks.includes(mark) ? marks.filter((current) => current !== mark) : [...marks, mark]
}

function MarkToggles({
  fragment,
  onChange,
}: {
  fragment: ITextFragment
  onChange: (fragment: ITextFragment) => void
}): VNode {
  return (
    <span class="cluster">
      {MARKS.map(({ mark, label }) => (
        <button
          key={mark}
          type="button"
          class="btn btn-ghost btn-sm"
          data-mark={mark}
          aria-label={label}
          aria-pressed={(fragment.marks ?? []).includes(mark)}
          onClick={() => onChange({ ...fragment, marks: toggledMarks(fragment, mark) })}
        >
          {label[0]}
        </button>
      ))}
    </span>
  )
}

function FragmentRow({
  fragment,
  onChange,
}: {
  fragment: ITextFragment
  onChange: (fragment: ITextFragment) => void
}): VNode {
  if (fragment.type === 'literal') {
    return (
      <input
        type="text"
        class="wb-fragment-field"
        data-fragment="literal"
        aria-label="Texto literal"
        value={fragment.text}
        onInput={(event) =>
          onChange({ ...fragment, text: (event.currentTarget as HTMLInputElement).value })
        }
      />
    )
  }
  return (
    <>
      <input
        type="text"
        class="wb-fragment-field"
        data-fragment="binding"
        list={DATA_PATHS_LIST}
        placeholder="ruta.de.datos"
        aria-label="Ruta de datos"
        value={fragment.path}
        onInput={(event) =>
          onChange({ ...fragment, path: (event.currentTarget as HTMLInputElement).value })
        }
      />
      <select
        data-fragment-format="true"
        aria-label="Formato"
        value={fragment.format ?? ''}
        onChange={(event) => {
          const chosen = (event.currentTarget as HTMLSelectElement).value
          onChange({ ...fragment, format: chosen ? chosen : undefined })
        }}
      >
        <option value="">sin formato</option>
        {FORMATS.map((format) => (
          <option key={format} value={format}>
            {format}
          </option>
        ))}
      </select>
    </>
  )
}

export function TextContentEditor({ content, doc, onChange }: ITextContentEditorProps): VNode {
  const fragments = content.fragments ?? []

  function update(next: ITextFragment[]): void {
    onChange({ fragments: next })
  }

  function move(index: number, offset: number): void {
    const target = index + offset
    if (target < 0 || target >= fragments.length) return
    const next = [...fragments]
    ;[next[index], next[target]] = [next[target], next[index]]
    update(next)
  }

  return (
    <div class="stack-sm">
      <datalist id={DATA_PATHS_LIST}>
        {doc.dataSchema.map((entry) => (
          <option key={entry.path} value={entry.path} />
        ))}
      </datalist>

      {fragments.map((fragment, index) => (
        <div key={index} class="wb-fragment">
          <FragmentRow
            fragment={fragment}
            onChange={(next) => update(replaceAt(fragments, index, next))}
          />
          <MarkToggles
            fragment={fragment}
            onChange={(next) => update(replaceAt(fragments, index, next))}
          />
          <button
            type="button"
            class="wb-icon-button"
            data-move="up"
            aria-label="Subir fragmento"
            onClick={() => move(index, -1)}
          >
            <ArrowUpIcon />
          </button>
          <button
            type="button"
            class="wb-icon-button"
            data-move="down"
            aria-label="Bajar fragmento"
            onClick={() => move(index, 1)}
          >
            <ArrowDownIcon />
          </button>
          <button
            type="button"
            class="wb-icon-button"
            data-remove-fragment="true"
            aria-label="Quitar fragmento"
            onClick={() => update(fragments.filter((_, position) => position !== index))}
          >
            <CloseIcon />
          </button>
        </div>
      ))}

      <div class="cluster">
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          data-add-fragment="literal"
          onClick={() => update([...fragments, { type: 'literal', text: 'Texto' }])}
        >
          Añadir texto
        </button>
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          data-add-fragment="binding"
          onClick={() => update([...fragments, { type: 'binding', path: '' }])}
        >
          Añadir dato
        </button>
      </div>
    </div>
  )
}
