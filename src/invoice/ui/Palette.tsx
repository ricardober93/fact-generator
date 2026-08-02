import { useRef, useSignal, type VNode } from '@wabot-dev/framework/ui'
import { blockKinds, blockKindsForBand } from '../render/blocks/registry'
import type { IBandName } from '../render/document'
import { addBlockAt } from './arrange'
import { bandPointAt } from './canvasGestures'
import { selectedBand, type IEditorStore } from './editorStore'

interface IGhost {
  kind: string
  originXPx: number
  originYPx: number
  xPx: number
  yPx: number
  active: boolean
}

const DRAG_THRESHOLD_PX = 4

export function Palette({ store }: { store: IEditorStore }): VNode {
  const band = selectedBand(store)
  const ghost = useSignal<IGhost | null>(null)
  const dropped = useRef(false)
  const kinds = band ? blockKindsForBand(band) : blockKinds()

  function insert(kind: string, target: IBandName, xMm: number, yMm: number): void {
    try {
      const result = addBlockAt(store.doc.value, target, kind, xMm, yMm)
      store.commit(result.doc)
      store.select(target, result.blockIds)
    } catch {
      store.select(target, [])
    }
  }

  function onPointerDown(event: PointerEvent, kind: string): void {
    ghost.value = {
      kind,
      originXPx: event.clientX,
      originYPx: event.clientY,
      xPx: event.clientX,
      yPx: event.clientY,
      active: false,
    }
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent): void {
    const dragging = ghost.value
    if (!dragging) return
    const travelled = Math.hypot(
      event.clientX - dragging.originXPx,
      event.clientY - dragging.originYPx,
    )
    ghost.value = {
      ...dragging,
      xPx: event.clientX,
      yPx: event.clientY,
      active: dragging.active || travelled > DRAG_THRESHOLD_PX,
    }
  }

  function onPointerUp(event: PointerEvent): void {
    const dragging = ghost.value
    ghost.value = null
    if (!dragging || !dragging.active) return
    const point = bandPointAt(event.clientX, event.clientY, store.doc.value)
    if (!point) return
    dropped.current = true
    insert(dragging.kind, point.band, Math.round(point.xMm), Math.round(point.yMm))
  }

  function onClick(kind: string): void {
    if (dropped.current) {
      dropped.current = false
      return
    }
    if (!band) return
    insert(kind, band, 0, 0)
  }

  return (
    <fieldset class="stack-sm">
      <legend>Bloques</legend>
      {!band ? <p class="muted">Arrastra un bloque al documento o elige una banda.</p> : null}
      <div class="wb-palette">
        {kinds.map((kind) => (
          <button
            key={kind}
            type="button"
            class="btn btn-secondary btn-sm"
            data-palette-kind={kind}
            onPointerDown={(event: PointerEvent) => onPointerDown(event, kind)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              ghost.value = null
            }}
            onLostPointerCapture={() => {
              ghost.value = null
            }}
            onClick={() => onClick(kind)}
          >
            {kind}
          </button>
        ))}
      </div>
      {ghost.value?.active ? (
        <span
          class="wb-ghost"
          data-ghost={ghost.value.kind}
          style={{ left: `${ghost.value.xPx}px`, top: `${ghost.value.yPx}px` }}
        >
          {ghost.value.kind}
        </span>
      ) : null}
    </fieldset>
  )
}
