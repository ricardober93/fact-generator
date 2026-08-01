import {
  actionUrl,
  callAction,
  island,
  useEffect,
  useMemo,
  type VNode,
} from '@wabot-dev/framework/ui'
import type { IDocument } from '../render/document'
import { Canvas } from './Canvas'
import { Inspector } from './Inspector'
import { Palette } from './Palette'
import { removeBlock } from './documentEdits'
import { createEditorStore, type IEditorStore, type ISaveState } from './editorStore'
import type { IAssetChoice } from './propertyEditors'

const SAVE_URL = actionUrl('/templates', 'save')

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

export interface IEditorProps {
  id: string
  doc: IDocument
  rev: number
  assets: IAssetChoice[]
  assetUris: Record<string, string>
}

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element || !element.tagName) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable
}

function useShortcuts(store: IEditorStore): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (isTypingTarget(event.target)) return
      const meta = event.metaKey || event.ctrlKey
      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) store.redo()
        else store.undo()
        return
      }
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      const band = store.selectedBand.value
      const blockId = store.selectedBlockId.value
      if (!band || !blockId) return
      event.preventDefault()
      store.commit(removeBlock(store.doc.value, band, blockId))
      store.select(band, null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [store])
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

function Toolbar({ store, onSave }: { store: IEditorStore; onSave: () => void }): VNode {
  return (
    <header class="wb-toolbar">
      <a class="btn btn-ghost btn-sm" href="/templates">
        Plantillas
      </a>
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
      <span class="wb-toolbar-gap" />
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

function Editor(props: IEditorProps): VNode {
  const store = useMemo(
    () => createEditorStore({ templateId: props.id, doc: props.doc, rev: props.rev }),
    [props.id],
  )
  useShortcuts(store)

  async function save(): Promise<void> {
    store.status.value = { state: 'saving', message: 'Guardando' }
    try {
      const result = await callAction<{ rev: number }>(SAVE_URL, {
        id: store.templateId,
        doc: store.doc.value,
        rev: store.rev.value,
      })
      store.rev.value = result.rev
      store.status.value = { state: 'saved', message: 'Guardado' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar'
      const conflict = /409|revisi/i.test(message)
      store.status.value = {
        state: conflict ? 'conflict' : 'error',
        message: conflict ? 'Otro guardado se adelantó. Tus cambios siguen aquí.' : message,
      }
    }
  }

  return (
    <div class="wb-shell">
      <Toolbar store={store} onSave={save} />
      <div class="wb-body">
        <div class="wb-panel">
          <Palette store={store} />
        </div>
        <div class="wb-stage">
          <Canvas store={store} assets={props.assetUris} />
        </div>
        <div class="wb-panel">
          <Inspector store={store} assets={props.assets} />
        </div>
      </div>
    </div>
  )
}

export default island(Editor)
