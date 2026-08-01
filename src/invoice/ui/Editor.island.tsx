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
import { createEditorStore, type IEditorStore } from './editorStore'
import type { IAssetChoice } from './propertyEditors'

const SAVE_URL = actionUrl('/templates', 'save')

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

function StatusLine({ store }: { store: IEditorStore }): VNode {
  const status = store.status.value
  const colors: Record<string, string> = {
    idle: '#666',
    saving: '#666',
    saved: '#0a7a2f',
    conflict: '#a05000',
    error: '#a00000',
  }
  return (
    <span data-save-state={status.state} style={{ fontSize: '12px', color: colors[status.state] }}>
      {status.message}
    </span>
  )
}

function Toolbar({ store, onSave }: { store: IEditorStore; onSave: () => void }): VNode {
  return (
    <header
      style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid #ddd',
      }}
    >
      <button type="button" data-action="undo" onClick={() => store.undo()}>
        Deshacer
      </button>
      <button type="button" data-action="redo" onClick={() => store.redo()}>
        Rehacer
      </button>
      <button type="button" data-action="save" onClick={onSave}>
        Guardar
      </button>
      <span style={{ fontSize: '12px', color: '#666' }}>rev {store.rev.value}</span>
      <StatusLine store={store} />
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
    store.status.value = { state: 'saving', message: 'Guardando…' }
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
        message: conflict
          ? 'Otro guardado se adelantó. Tus cambios siguen aquí; recarga para ver el suyo.'
          : message,
      }
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100vh' }}>
      <Toolbar store={store} onSave={save} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '200px 1fr 260px',
          gap: '12px',
          padding: '12px',
          overflow: 'auto',
          background: '#f4f4f5',
        }}
      >
        <Palette store={store} />
        <Canvas store={store} assets={props.assetUris} />
        <Inspector store={store} assets={props.assets} />
      </div>
    </div>
  )
}

export default island(Editor)
