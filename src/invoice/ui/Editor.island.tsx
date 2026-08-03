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
import { duplicateBlocks, moveBlocks, copiedBlocks, pasteBlocks } from './arrange'
import { Inspector } from './Inspector'
import { LayersPanel } from './LayersPanel'
import { Palette } from './Palette'
import { removeBlocks } from './documentEdits'
import { createEditorStore, type IEditorStore, type ISelection } from './editorStore'
import { Toolbar } from './EditorToolbar'
import type { IAssetChoice } from './propertyEditors'
import { CONFLICT_MESSAGE } from './saveOutcome'
import { ThemePanel } from './ThemePanel'

const SAVE_URL = actionUrl('/templates', 'save')

const NUDGE_MM = 1

const BIG_NUDGE_MM = 10

const ARROWS: Record<string, { xMm: number; yMm: number }> = {
  ArrowLeft: { xMm: -1, yMm: 0 },
  ArrowRight: { xMm: 1, yMm: 0 },
  ArrowUp: { xMm: 0, yMm: -1 },
  ArrowDown: { xMm: 0, yMm: 1 },
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

function handleHistory(store: IEditorStore, event: KeyboardEvent): boolean {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return false
  event.preventDefault()
  if (event.shiftKey) store.redo()
  else store.undo()
  return true
}

function handleClipboard(
  store: IEditorStore,
  selection: ISelection,
  event: KeyboardEvent,
): boolean {
  const key = event.key.toLowerCase()
  if (!(event.metaKey || event.ctrlKey) || !['c', 'v', 'd'].includes(key)) return false
  event.preventDefault()
  if (key === 'c') {
    store.clipboard.value = copiedBlocks(store.doc.value, selection.band, selection.blockIds)
    return true
  }
  const result =
    key === 'd'
      ? duplicateBlocks(store.doc.value, selection.band, selection.blockIds)
      : pasteBlocks(store.doc.value, selection.band, store.clipboard.value)
  if (result.blockIds.length === 0) return true
  store.commit(result.doc)
  store.select(selection.band, result.blockIds)
  return true
}

function handleSelectionKeys(
  store: IEditorStore,
  selection: ISelection,
  event: KeyboardEvent,
): void {
  if (event.key === 'Escape') {
    store.clearSelection()
    return
  }
  if (handleClipboard(store, selection, event)) return
  if (selection.blockIds.length === 0) return
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    store.commit(removeBlocks(store.doc.value, selection.band, selection.blockIds))
    store.select(selection.band, [])
    return
  }
  const arrow = ARROWS[event.key]
  if (!arrow) return
  event.preventDefault()
  const step = event.shiftKey ? BIG_NUDGE_MM : NUDGE_MM
  store.commit(
    moveBlocks(
      store.doc.value,
      selection.band,
      selection.blockIds,
      arrow.xMm * step,
      arrow.yMm * step,
    ),
  )
}

function useShortcuts(store: IEditorStore): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (isTypingTarget(event.target)) return
      if (handleHistory(store, event)) return
      const selection = store.selection.value
      if (!selection) return
      handleSelectionKeys(store, selection, event)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [store])
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
      const result = await callAction<{ status?: string; rev: number }>(SAVE_URL, {
        id: store.templateId,
        doc: store.doc.value,
        rev: store.rev.value,
      })
      store.rev.value = result.rev
      store.status.value =
        result.status === 'conflict'
          ? { state: 'conflict', message: CONFLICT_MESSAGE }
          : { state: 'saved', message: 'Guardado' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar'
      store.status.value = { state: 'error', message }
    }
  }

  return (
    <div class="wb-shell">
      <Toolbar store={store} onSave={save} />
      <div class="wb-body">
        <div class="wb-panel stack">
          <LayersPanel store={store} />
          <Palette store={store} />
        </div>
        <div class="wb-stage">
          <Canvas store={store} assets={props.assetUris} />
        </div>
        <div class="wb-panel stack">
          <Inspector store={store} assets={props.assets} />
          <ThemePanel store={store} />
        </div>
      </div>
    </div>
  )
}

export default island(Editor)
