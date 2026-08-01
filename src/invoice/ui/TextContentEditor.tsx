import type { VNode } from '@wabot-dev/framework/ui'
import { FORMATS } from '../render/format'
import type { IDocument, ITextContent, ITextFragment, ITextMark } from '../render/document'

const MARKS: ITextMark[] = ['bold', 'italic', 'underline']

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
    <span style={{ display: 'inline-flex', gap: '2px' }}>
      {MARKS.map((mark) => (
        <button
          key={mark}
          type="button"
          data-mark={mark}
          aria-pressed={(fragment.marks ?? []).includes(mark)}
          onClick={() => onChange({ ...fragment, marks: toggledMarks(fragment, mark) })}
          style={{
            fontWeight: (fragment.marks ?? []).includes(mark) ? 'bold' : 'normal',
            width: '24px',
          }}
        >
          {mark[0].toUpperCase()}
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
        data-fragment="literal"
        style={{ flex: '1' }}
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
        data-fragment="binding"
        list={DATA_PATHS_LIST}
        placeholder="ruta.de.datos"
        style={{ flex: '1' }}
        value={fragment.path}
        onInput={(event) =>
          onChange({ ...fragment, path: (event.currentTarget as HTMLInputElement).value })
        }
      />
      <select
        data-fragment-format="true"
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
    <div style={{ display: 'grid', gap: '4px' }}>
      <datalist id={DATA_PATHS_LIST}>
        {doc.dataSchema.map((entry) => (
          <option key={entry.path} value={entry.path} />
        ))}
      </datalist>

      {fragments.map((fragment, index) => (
        <div key={index} style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          <FragmentRow
            fragment={fragment}
            onChange={(next) => update(replaceAt(fragments, index, next))}
          />
          <MarkToggles
            fragment={fragment}
            onChange={(next) => update(replaceAt(fragments, index, next))}
          />
          <button type="button" data-move="up" onClick={() => move(index, -1)}>
            ↑
          </button>
          <button type="button" data-move="down" onClick={() => move(index, 1)}>
            ↓
          </button>
          <button
            type="button"
            data-remove-fragment="true"
            onClick={() => update(fragments.filter((_, position) => position !== index))}
          >
            ×
          </button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          type="button"
          data-add-fragment="literal"
          onClick={() => update([...fragments, { type: 'literal', text: 'Texto' }])}
        >
          + texto
        </button>
        <button
          type="button"
          data-add-fragment="binding"
          onClick={() => update([...fragments, { type: 'binding', path: '' }])}
        >
          + dato
        </button>
      </div>
    </div>
  )
}
