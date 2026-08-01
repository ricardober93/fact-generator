import type { VNode } from '@wabot-dev/framework/ui'
import { findBlockDefinition } from '../render/blocks/registry'
import type { IBandName, IBlock, IDocument, IPropValue } from '../render/document'
import { applyPropChange, findBlock, setBlockRect, setThemeToken } from './documentEdits'
import type { IEditorStore } from './editorStore'
import { PropertyEditor, type IAssetChoice } from './propertyEditors'

const GEOMETRY: Array<{ key: keyof IBlock & string; label: string }> = [
  { key: 'xMm', label: 'X (mm)' },
  { key: 'yMm', label: 'Y (mm)' },
  { key: 'widthMm', label: 'Ancho (mm)' },
  { key: 'heightMm', label: 'Alto (mm)' },
]

function Field({ label, children }: { label: string; children: unknown }): VNode {
  return (
    <label style={{ display: 'grid', gap: '2px', fontSize: '12px', minWidth: 0 }}>
      <span style={{ color: '#555' }}>{label}</span>
      {children as VNode}
    </label>
  )
}

function GeometryFields({
  store,
  band,
  block,
}: {
  store: IEditorStore
  band: IBandName
  block: IBlock
}): VNode {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
      {GEOMETRY.map(({ key, label }) => (
        <Field key={key} label={label}>
          <input
            type="number"
            step="any"
            data-geometry={key}
            style={{ width: '100%', minWidth: 0 }}
            value={Number(block[key])}
            onInput={(event) => {
              const parsed = Number((event.currentTarget as HTMLInputElement).value)
              if (!Number.isFinite(parsed)) return
              store.commit(
                setBlockRect(store.doc.value, band, block.id, { ...block, [key]: parsed }),
              )
            }}
          />
        </Field>
      ))}
    </div>
  )
}

export function Inspector({ store, assets }: { store: IEditorStore; assets: IAssetChoice[] }) {
  const band = store.selectedBand.value
  const blockId = store.selectedBlockId.value
  const doc = store.doc.value
  const block = band && blockId ? findBlock(doc, band, blockId) : null

  if (!band || !block) {
    return (
      <aside style={{ fontSize: '12px', color: '#666' }}>
        Selecciona un bloque para editar sus propiedades.
      </aside>
    )
  }

  const definition = findBlockDefinition(block.kind)
  if (!definition) {
    return (
      <aside style={{ fontSize: '12px', color: '#a00' }}>Tipo «{block.kind}» desconocido.</aside>
    )
  }

  function changeProp(propName: string, value: IPropValue): void {
    store.commit(applyPropChange(store.doc.value, band as IBandName, block!.id, propName, value))
  }

  function changeTheme(token: string, value: string): void {
    store.commit(setThemeToken(store.doc.value, token, value))
  }

  const Custom = definition.Inspector

  return (
    <aside style={{ display: 'grid', gap: '10px', minWidth: 0 }}>
      <h2 style={{ fontSize: '13px', margin: 0 }}>{block.kind}</h2>
      <GeometryFields store={store} band={band} block={block} />

      {Custom ? (
        <Custom block={block} doc={doc} onChange={changeProp} />
      ) : (
        Object.entries(definition.schema).map(([propName, propType]) => (
          <Field key={propName} label={propName}>
            <PropertyEditor
              name={propName}
              type={propType}
              value={block.props[propName]}
              doc={doc}
              assets={assets}
              onChange={(value) => changeProp(propName, value)}
              onThemeChange={changeTheme}
            />
          </Field>
        ))
      )}
    </aside>
  )
}
