import { signal, type Signal } from '@wabot-dev/framework/ui'
import type { IBandName, IDocument } from '../render/document'

export const UNDO_LIMIT = 50

export type ISaveState = 'idle' | 'saving' | 'saved' | 'conflict' | 'error'

export interface ISaveStatus {
  state: ISaveState
  message: string
}

export interface IEditorStore {
  readonly templateId: string
  doc: Signal<IDocument>
  rev: Signal<number>
  selectedBand: Signal<IBandName | null>
  selectedBlockId: Signal<string | null>
  status: Signal<ISaveStatus>
  commit(next: IDocument): void
  undo(): void
  redo(): void
  canUndo(): boolean
  canRedo(): boolean
  select(band: IBandName | null, blockId: string | null): void
}

export interface IEditorStoreInput {
  templateId: string
  doc: IDocument
  rev: number
}

const IDLE: ISaveStatus = { state: 'idle', message: '' }

export function createEditorStore(input: IEditorStoreInput): IEditorStore {
  if (!input || !input.templateId) throw new Error('createEditorStore requires a template id')
  if (!input.doc) throw new Error('createEditorStore requires a document')
  if (!Number.isFinite(input.rev)) throw new Error('createEditorStore requires a revision')

  const doc = signal<IDocument>(input.doc)
  const rev = signal<number>(input.rev)
  const selectedBand = signal<IBandName | null>(null)
  const selectedBlockId = signal<string | null>(null)
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

  function select(band: IBandName | null, blockId: string | null): void {
    selectedBand.value = band
    selectedBlockId.value = band ? blockId : null
  }

  return {
    templateId: input.templateId,
    doc,
    rev,
    selectedBand,
    selectedBlockId,
    status,
    commit,
    undo,
    redo,
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    select,
  }
}
