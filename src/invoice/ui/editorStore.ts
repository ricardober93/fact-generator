import { signal, type Signal } from '@wabot-dev/framework/ui'
import type { IBandName, IBlock, IDocument } from '../render/document'

export const UNDO_LIMIT = 50

export const MIN_ZOOM = 0.25

export const MAX_ZOOM = 4

export const ZOOM_STEP = 0.25

export type ISaveState = 'idle' | 'saving' | 'saved' | 'conflict' | 'error'

export interface ISaveStatus {
  state: ISaveState
  message: string
}

export interface ISelection {
  band: IBandName
  blockIds: string[]
}

export interface IEditorStore {
  readonly templateId: string
  doc: Signal<IDocument>
  rev: Signal<number>
  selection: Signal<ISelection | null>
  clipboard: Signal<IBlock[]>
  zoom: Signal<number>
  status: Signal<ISaveStatus>
  commit(next: IDocument): void
  undo(): void
  redo(): void
  canUndo(): boolean
  canRedo(): boolean
  select(band: IBandName | null, blockIds?: string[]): void
  toggleInSelection(band: IBandName, blockId: string): void
  clearSelection(): void
  setZoom(value: number): void
}

export interface IEditorStoreInput {
  templateId: string
  doc: IDocument
  rev: number
}

const IDLE: ISaveStatus = { state: 'idle', message: '' }

function clampZoom(value: number): number {
  if (!Number.isFinite(value)) throw new Error('setZoom requires a finite scale')
  return Math.min(Math.max(value, MIN_ZOOM), MAX_ZOOM)
}

export function createEditorStore(input: IEditorStoreInput): IEditorStore {
  if (!input || !input.templateId) throw new Error('createEditorStore requires a template id')
  if (!input.doc) throw new Error('createEditorStore requires a document')
  if (!Number.isFinite(input.rev)) throw new Error('createEditorStore requires a revision')

  const doc = signal<IDocument>(input.doc)
  const rev = signal<number>(input.rev)
  const selection = signal<ISelection | null>(null)
  const clipboard = signal<IBlock[]>([])
  const zoom = signal<number>(1)
  const status = signal<ISaveStatus>(IDLE)
  const undoStack: IDocument[] = []
  const redoStack: IDocument[] = []

  function commit(next: IDocument): void {
    if (!next) throw new Error('commit requires a document')
    if (next === doc.value) return
    undoStack.push(structuredClone(doc.value))
    if (undoStack.length > UNDO_LIMIT) undoStack.shift()
    redoStack.length = 0
    doc.value = next
  }

  function undo(): void {
    const previous = undoStack.pop()
    if (!previous) return
    redoStack.push(structuredClone(doc.value))
    doc.value = previous
  }

  function redo(): void {
    const next = redoStack.pop()
    if (!next) return
    undoStack.push(structuredClone(doc.value))
    doc.value = next
  }

  function select(band: IBandName | null, blockIds: string[] = []): void {
    selection.value = band ? { band, blockIds: [...blockIds] } : null
  }

  function toggleInSelection(band: IBandName, blockId: string): void {
    if (!blockId) throw new Error('toggleInSelection requires a block id')
    const current = selection.value
    if (!current || current.band !== band) {
      select(band, [blockId])
      return
    }
    const blockIds = current.blockIds.includes(blockId)
      ? current.blockIds.filter((id) => id !== blockId)
      : [...current.blockIds, blockId]
    selection.value = { band, blockIds }
  }

  return {
    templateId: input.templateId,
    doc,
    rev,
    selection,
    clipboard,
    zoom,
    status,
    commit,
    undo,
    redo,
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    select,
    toggleInSelection,
    clearSelection: () => select(null),
    setZoom: (value: number) => {
      zoom.value = clampZoom(value)
    },
  }
}

export function selectedBand(store: IEditorStore): IBandName | null {
  return store.selection.value?.band ?? null
}

export function selectedBlockIds(store: IEditorStore): string[] {
  return store.selection.value?.blockIds ?? []
}

export function singleSelectedBlockId(store: IEditorStore): string | null {
  const blockIds = selectedBlockIds(store)
  return blockIds.length === 1 ? blockIds[0] : null
}
