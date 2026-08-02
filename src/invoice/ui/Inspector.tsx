import type { VNode } from '@wabot-dev/framework/ui'
import { findBlockDefinition } from '../render/blocks/registry'
import type { IBandName, IBlock, IPropValue } from '../render/document'
import {
  applyPropChange,
  findBlock,
  setBandHeight,
  setBlockRect,
  setThemeToken,
} from './documentEdits'
import { selectedBand, singleSelectedBlockId, type IEditorStore } from './editorStore'
import { BAND_LABELS } from './LayersPanel'
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

function BandFields({ store, band }: { store: IEditorStore; band: IBandName }): VNode {
  return (
    <fieldset class="stack-sm">
      <legend>{BAND_LABELS[band]}</legend>
      <Field id="band-height" label="Alto (mm)">
        <input
          id="band-height"
          type="number"
          step="any"
          data-band-height={band}
          value={store.doc.value.bands[band].heightMm}
          onInput={(event) => {
            const parsed = Number((event.currentTarget as HTMLInputElement).value)
            if (!Number.isFinite(parsed) || parsed <= 0) return
            store.commit(setBandHeight(store.doc.value, band, parsed))
          }}
        />
      </Field>
    </fieldset>
  )
}

export function Inspector({
  store,
  assets,
}: {
  store: IEditorStore
  assets: IAssetChoice[]
}): VNode {
  const band = selectedBand(store)
  const blockId = singleSelectedBlockId(store)
  const doc = store.doc.value
  const block = band && blockId ? findBlock(doc, band, blockId) : null

  if (!band || !block) {
    return (
      <aside class="stack">
        {band ? <BandFields store={store} band={band} /> : null}
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
                widthMm={block.widthMm}
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
