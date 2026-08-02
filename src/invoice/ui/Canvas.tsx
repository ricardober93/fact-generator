import { useEffect, useRef, useSignal, type VNode } from '@wabot-dev/framework/ui'
import { usableWidthMm } from '../render/document'
import { render } from '../render/render'
import { sampleDataFor } from '../render/sampleData'
import { blocksWithin } from './arrange'
import {
  bandPointAt,
  isBandName,
  marqueePreview,
  movePreview,
  pickableBlockId,
  rectOf,
  resizePreview,
  type IGesture,
  type IPreview,
} from './canvasGestures'
import { findBlock, setBlockRects } from './documentEdits'
import type { IHandle, IRect } from './geometry'
import { SelectionLayer, type IBandGeometry } from './SelectionLayer'
import type { IEditorStore } from './editorStore'

interface ICanvasProps {
  store: IEditorStore
  assets: Record<string, string>
}

function sameRect(rect: IRect, candidate: IRect | undefined): boolean {
  return (
    !!candidate &&
    rect.xMm === candidate.xMm &&
    rect.yMm === candidate.yMm &&
    rect.widthMm === candidate.widthMm &&
    rect.heightMm === candidate.heightMm
  )
}

function geometryOf(
  surface: HTMLDivElement,
  band: string,
  pxPerMm: number,
  zoom: number,
): IBandGeometry | null {
  const node = surface.querySelector(`[data-band="${band}"]`)
  if (!node) return null
  const bandBox = node.getBoundingClientRect()
  const surfaceBox = surface.getBoundingClientRect()
  return {
    leftPx: (bandBox.left - surfaceBox.left) / zoom,
    topPx: (bandBox.top - surfaceBox.top) / zoom,
    pxPerMm: pxPerMm / zoom,
  }
}

export function Canvas({ store, assets }: ICanvasProps): VNode {
  const surface = useRef<HTMLDivElement>(null)
  const pxPerMm = useSignal(0)
  const preview = useSignal<IPreview | null>(null)
  const paperPx = useSignal({ widthPx: 0, heightPx: 0 })
  const gesture = useRef<IGesture | null>(null)

  const doc = store.doc.value
  const zoom = store.zoom.value
  const sample = sampleDataFor(doc)
  const selection = store.selection.value

  useEffect(() => {
    const node = surface.current
    if (!node) return
    const measure = (): void => {
      const width = node.getBoundingClientRect().width
      if (width > 0) pxPerMm.value = width / usableWidthMm(store.doc.value.page)
      paperPx.value = { widthPx: node.offsetWidth, heightPx: node.offsetHeight }
    }
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    measure()
    return () => observer.disconnect()
  }, [zoom])

  function startGesture(
    kind: IGesture['kind'],
    band: string,
    blockIds: string[],
    event: PointerEvent,
    handle: IHandle = 'se',
  ): void {
    if (!isBandName(band) || pxPerMm.value <= 0) return
    const point = bandPointAt(event.clientX, event.clientY, store.doc.value)
    const startRects: Record<string, IRect> = {}
    for (const blockId of blockIds) {
      const block = findBlock(store.doc.value, band, blockId)
      if (block) startRects[blockId] = rectOf(block)
    }
    if (kind !== 'marquee' && Object.keys(startRects).length === 0) return
    gesture.current = {
      kind,
      band,
      blockIds,
      startRects,
      originX: event.clientX,
      originY: event.clientY,
      originMm: { xMm: point?.xMm ?? 0, yMm: point?.yMm ?? 0 },
      handle,
    }
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  function onPointerDown(event: PointerEvent): void {
    const target = event.target as Element | null
    const handle = target?.closest('[data-resize-handle]')?.getAttribute('data-resize-handle')
    const current = store.selection.value
    if (handle && current && current.blockIds.length === 1) {
      startGesture('resize', current.band, current.blockIds, event, handle as IHandle)
      return
    }
    const projected = target?.closest('[data-block-header]')?.getAttribute('data-block-header')
    if (projected) {
      store.select('detail', [projected])
      return
    }
    const band = target?.closest('[data-band]')?.getAttribute('data-band') ?? null
    if (!isBandName(band)) {
      store.clearSelection()
      return
    }
    const clicked = target?.closest('[data-block]')?.getAttribute('data-block') ?? null
    const blockId = pickableBlockId(store.doc.value, band, clicked)
    if (!blockId) {
      store.select(band, [])
      startGesture('marquee', band, [], event)
      return
    }
    if (event.shiftKey) {
      store.toggleInSelection(band, blockId)
      return
    }
    const alreadySelected = current?.band === band && current.blockIds.includes(blockId)
    const blockIds = alreadySelected ? current!.blockIds : [blockId]
    if (!alreadySelected) store.select(band, blockIds)
    startGesture('move', band, blockIds, event)
  }

  function onPointerMove(event: PointerEvent): void {
    const active = gesture.current
    if (!active) return
    const delta = {
      xPx: event.clientX - active.originX,
      yPx: event.clientY - active.originY,
      pxPerMm: pxPerMm.value,
      snap: !event.altKey,
    }
    if (active.kind === 'marquee') {
      const point = bandPointAt(event.clientX, event.clientY, store.doc.value)
      preview.value = marqueePreview(store.doc.value, active, point ?? active.originMm)
      return
    }
    preview.value =
      active.kind === 'move'
        ? movePreview(store.doc.value, active, delta)
        : resizePreview(store.doc.value, active, delta)
  }

  function onPointerUp(): void {
    const active = gesture.current
    const result = preview.value
    gesture.current = null
    preview.value = null
    if (!active || !result) return
    if (active.kind === 'marquee') {
      if (!result.marquee) return
      store.select(active.band, blocksWithin(store.doc.value, active.band, result.marquee))
      return
    }
    const unchanged = active.blockIds.every((blockId) => {
      const block = findBlock(store.doc.value, active.band, blockId)
      return !block || sameRect(block, result.rects[blockId])
    })
    if (unchanged) return
    store.commit(setBlockRects(store.doc.value, active.band, result.rects))
  }

  const geometry =
    surface.current && selection && pxPerMm.value > 0
      ? geometryOf(surface.current, preview.value?.band ?? selection.band, pxPerMm.value, zoom)
      : null

  return (
    <div
      class="wb-zoom"
      style={{
        width: paperPx.value.widthPx ? `${paperPx.value.widthPx * zoom}px` : undefined,
        height: paperPx.value.heightPx ? `${paperPx.value.heightPx * zoom}px` : undefined,
      }}
    >
      <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
        <div
          ref={surface}
          data-document-surface="true"
          class="wb-paper"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ width: `${usableWidthMm(doc.page)}mm` }}
        >
          {render({ doc, data: sample.data, items: [sample.item], assets })}
          {selection && geometry ? (
            <SelectionLayer
              doc={doc}
              band={preview.value?.band ?? selection.band}
              blockIds={selection.blockIds}
              preview={preview.value}
              geometry={geometry}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
