import type { VNode } from '@wabot-dev/framework/ui'
import { enumValues, type IPropType } from '../render/blocks/defineBlock'
import {
  isTokenReference,
  tokenName,
  type IDocument,
  type IPropValue,
  type ITextContent,
} from '../render/document'
import { TextContentEditor } from './TextContentEditor'

export interface IPropertyEditorProps {
  name: string
  type: IPropType
  value: IPropValue
  doc: IDocument
  assets: IAssetChoice[]
  onChange: (value: IPropValue) => void
  onThemeChange: (token: string, value: string) => void
}

export interface IAssetChoice {
  id: string
  label: string
}

const FIELD_STYLE = { width: '100%', minWidth: 0 }

function StringEditor({ value, onChange }: IPropertyEditorProps): VNode {
  return (
    <input
      type="text"
      style={FIELD_STYLE}
      value={String(value ?? '')}
      onInput={(event) => onChange((event.currentTarget as HTMLInputElement).value)}
    />
  )
}

function NumberEditor({ value, onChange }: IPropertyEditorProps): VNode {
  return (
    <input
      type="number"
      step="any"
      style={FIELD_STYLE}
      value={Number(value ?? 0)}
      onInput={(event) => {
        const parsed = Number((event.currentTarget as HTMLInputElement).value)
        if (Number.isFinite(parsed)) onChange(parsed)
      }}
    />
  )
}

function BooleanEditor({ value, onChange }: IPropertyEditorProps): VNode {
  return (
    <input
      type="checkbox"
      checked={value === true}
      onChange={(event) => onChange((event.currentTarget as HTMLInputElement).checked)}
    />
  )
}

function EnumEditor({ type, value, onChange }: IPropertyEditorProps): VNode {
  return (
    <select
      style={FIELD_STYLE}
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

function TokenEditor({ value, doc, onChange }: IPropertyEditorProps): VNode {
  return (
    <select
      style={FIELD_STYLE}
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
  const { value, doc, assets, onThemeChange } = props
  if (!isTokenReference(value)) {
    return <p style={{ fontSize: '12px', color: '#a00' }}>Esta propiedad no referencia un token.</p>
  }
  const token = tokenName(value)
  const current = String(doc.theme[token] ?? '')
  return (
    <>
      <select
        style={FIELD_STYLE}
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
      <p style={{ fontSize: '11px', color: '#666', margin: '2px 0 0' }}>
        El bloque referencia @{token}; la imagen se elige en el tema.
      </p>
    </>
  )
}

function TextEditor({ value, doc, onChange }: IPropertyEditorProps): VNode {
  const content =
    value && typeof value === 'object' && 'fragments' in value
      ? (value as ITextContent)
      : { fragments: [] }
  return <TextContentEditor content={content} doc={doc} onChange={onChange} />
}

export function PropertyEditor(props: IPropertyEditorProps): VNode {
  if (props.type === 'number') return <NumberEditor {...props} />
  if (props.type === 'boolean') return <BooleanEditor {...props} />
  if (props.type === 'token') return <TokenEditor {...props} />
  if (props.type === 'asset') return <AssetEditor {...props} />
  if (props.type === 'text') return <TextEditor {...props} />
  if (props.type.startsWith('enum:')) return <EnumEditor {...props} />
  return <StringEditor {...props} />
}
