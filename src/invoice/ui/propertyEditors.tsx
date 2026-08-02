import type { VNode } from '@wabot-dev/framework/ui'
import { enumValues, type IPropType } from '../render/blocks/defineBlock'
import {
  isCellList,
  isTokenReference,
  tokenName,
  type ICell,
  type IDocument,
  type IPropValue,
  type ITextContent,
} from '../render/document'
import { CellsEditor } from './CellsEditor'
import { TextContentEditor } from './TextContentEditor'

export interface IPropertyEditorProps {
  id: string
  name: string
  type: IPropType
  value: IPropValue
  doc: IDocument
  assets: IAssetChoice[]
  widthMm: number
  onChange: (value: IPropValue) => void
  onThemeChange: (token: string, value: string) => void
}

export interface IAssetChoice {
  id: string
  label: string
}

function StringEditor({ id, value, onChange }: IPropertyEditorProps): VNode {
  return (
    <input
      id={id}
      type="text"
      value={String(value ?? '')}
      onInput={(event) => onChange((event.currentTarget as HTMLInputElement).value)}
    />
  )
}

function NumberEditor({ id, value, onChange }: IPropertyEditorProps): VNode {
  return (
    <input
      id={id}
      type="number"
      step="any"
      value={Number(value ?? 0)}
      onInput={(event) => {
        const parsed = Number((event.currentTarget as HTMLInputElement).value)
        if (Number.isFinite(parsed)) onChange(parsed)
      }}
    />
  )
}

function BooleanEditor({ id, value, onChange }: IPropertyEditorProps): VNode {
  return (
    <input
      id={id}
      type="checkbox"
      checked={value === true}
      onChange={(event) => onChange((event.currentTarget as HTMLInputElement).checked)}
    />
  )
}

function EnumEditor({ id, type, value, onChange }: IPropertyEditorProps): VNode {
  return (
    <select
      id={id}
      value={String(value ?? '')}
      onChange={(event) => onChange((event.currentTarget as HTMLSelectElement).value)}
    >
      {enumValues(type).map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}

function TokenEditor({ id, value, doc, onChange }: IPropertyEditorProps): VNode {
  return (
    <select
      id={id}
      value={String(value ?? '')}
      onChange={(event) => onChange((event.currentTarget as HTMLSelectElement).value)}
    >
      {Object.keys(doc.theme).map((token) => (
        <option key={token} value={`@${token}`}>
          @{token}
        </option>
      ))}
    </select>
  )
}

function AssetEditor(props: IPropertyEditorProps): VNode {
  const { id, value, doc, assets, onThemeChange } = props
  if (!isTokenReference(value)) {
    return <p class="badge badge-warning">Esta propiedad no referencia un token.</p>
  }
  const token = tokenName(value)
  const current = String(doc.theme[token] ?? '')
  return (
    <div class="stack-sm">
      <select
        id={id}
        value={current}
        onChange={(event) => onThemeChange(token, (event.currentTarget as HTMLSelectElement).value)}
      >
        <option value="">Sin imagen</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.label}
          </option>
        ))}
      </select>
      <p class="faint">El bloque referencia @{token}; la imagen se elige en el tema.</p>
    </div>
  )
}

function TextEditor({ value, doc, onChange }: IPropertyEditorProps): VNode {
  const content =
    value && typeof value === 'object' && 'fragments' in value
      ? (value as ITextContent)
      : { fragments: [] }
  return <TextContentEditor content={content} doc={doc} onChange={onChange} />
}

function CellsPropertyEditor({ value, doc, widthMm, onChange }: IPropertyEditorProps): VNode {
  const cells: ICell[] = isCellList(value) ? value : []
  return (
    <CellsEditor cells={cells} doc={doc} widthMm={widthMm} onChange={(next) => onChange(next)} />
  )
}

export function PropertyEditor(props: IPropertyEditorProps): VNode {
  if (props.type === 'cells') return <CellsPropertyEditor {...props} />
  if (props.type === 'number') return <NumberEditor {...props} />
  if (props.type === 'boolean') return <BooleanEditor {...props} />
  if (props.type === 'token') return <TokenEditor {...props} />
  if (props.type === 'asset') return <AssetEditor {...props} />
  if (props.type === 'text') return <TextEditor {...props} />
  if (props.type.startsWith('enum:')) return <EnumEditor {...props} />
  return <StringEditor {...props} />
}
