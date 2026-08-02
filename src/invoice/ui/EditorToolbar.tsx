import { type VNode } from '@wabot-dev/framework/ui'
import { TEMPLATE_PRESETS } from '../templates/presets'
import { AlignBar } from './AlignBar'
import { applyPresetToStore } from './applyPreset'
import type { IEditorStore, ISaveState } from './editorStore'
import { ZoomControls } from './ZoomControls'

const BADGE_BY_STATE: Record<ISaveState, string> = {
  idle: '',
  saving: 'badge badge-info',
  saved: 'badge badge-success',
  conflict: 'badge badge-warning',
  error: 'badge badge-danger',
}

const DOT_BY_STATE: Record<ISaveState, string> = {
  idle: '',
  saving: 'dot dot-info dot-pulse',
  saved: 'dot dot-success',
  conflict: 'dot dot-warning',
  error: 'dot dot-danger',
}

function SaveStatus({ store }: { store: IEditorStore }): VNode {
  const status = store.status.value
  const dot = DOT_BY_STATE[status.state]
  return (
    <span class={BADGE_BY_STATE[status.state]} data-save-state={status.state}>
      {dot ? <span class={dot} /> : null}
      {status.message}
    </span>
  )
}

function PresetPicker({ store }: { store: IEditorStore }): VNode {
  return (
    <select
      class="btn btn-secondary btn-sm wb-preset-picker"
      aria-label="Aplicar un diseño"
      data-action="apply-preset"
      value=""
      onChange={(event) => {
        const select = event.currentTarget as HTMLSelectElement
        applyPresetToStore(store, select.value, (name) =>
          window.confirm(`Se sustituye el documento entero por «${name}». ¿Seguimos?`),
        )
        select.value = ''
      }}
    >
      <option value="">Aplicar diseño…</option>
      {TEMPLATE_PRESETS.map((preset) => (
        <option key={preset.id} value={preset.id}>
          {preset.name}
        </option>
      ))}
    </select>
  )
}

export function Toolbar({ store, onSave }: { store: IEditorStore; onSave: () => void }): VNode {
  return (
    <header class="wb-toolbar">
      <a class="btn btn-ghost btn-sm" href="/templates">
        Plantillas
      </a>
      <PresetPicker store={store} />
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        data-action="undo"
        onClick={() => store.undo()}
      >
        Deshacer
      </button>
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        data-action="redo"
        onClick={() => store.redo()}
      >
        Rehacer
      </button>
      <AlignBar store={store} />
      <span class="wb-toolbar-gap" />
      <ZoomControls store={store} />
      <span class="badge" data-rev={store.rev.value}>
        rev {store.rev.value}
      </span>
      <SaveStatus store={store} />
      <button type="button" class="btn btn-sm" data-action="save" onClick={onSave}>
        Guardar
      </button>
    </header>
  )
}
