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

function Field({ id, label, children }: { id: string; label: string; children: unknown }): VNode {
  return (
    <div class="stack-sm">
      <label for={id}>{label}</label>
      {children as VNode}
    </div>
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
    <div class="wb-geometry">
      {GEOMETRY.map(({ key, label }) => (
        <Field key={key} id={`geometry-${key}`} label={label}>
          <input
            id={`geometry-${key}`}
            type="number"
            step="any"
            data-geometry={key}
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

export function Inspector({
  store,
  assets,
}: {
  store: IEditorStore
  assets: IAssetChoice[]
}): VNode {
  const band = store.selectedBand.value
  const blockId = store.selectedBlockId.value
  const doc = store.doc.value
  const block = band && blockId ? findBlock(doc, band, blockId) : null

  if (!band || !block) {
    return (
      <aside class="stack">
        <p class="muted">Selecciona un bloque para editar sus propiedades.</p>
      </aside>
    )
  }

  const definition = findBlockDefinition(block.kind)
  if (!definition) {
    return (
      <aside class="stack">
        <p class="badge badge-danger">Tipo «{block.kind}» desconocido.</p>
      </aside>
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
    <aside class="stack">
      <fieldset class="stack-sm">
        <legend>{block.kind}</legend>
        <GeometryFields store={store} band={band} block={block} />
      </fieldset>

      <fieldset class="stack-sm">
        <legend>Propiedades</legend>
        {Custom ? (
          <Custom block={block} doc={doc} onChange={changeProp} />
        ) : (
          Object.entries(definition.schema).map(([propName, propType]) => (
            <Field key={propName} id={`prop-${propName}`} label={propName}>
              <PropertyEditor
                id={`prop-${propName}`}
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
      </fieldset>
    </aside>
  )
}
