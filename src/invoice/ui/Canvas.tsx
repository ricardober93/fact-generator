import { useEffect, useRef, useSignal, type Signal, type VNode } from '@wabot-dev/framework/ui'
import { BAND_NAMES, usableWidthMm, type IBandName } from '../render/document'
import { render } from '../render/render'
import { sampleDataFor } from '../render/sampleData'
import { bandBoxOf, findBlock, setBlockRect } from './documentEdits'
import { movedRect, resizedRect, type IRect } from './geometry'
import type { IEditorStore } from './editorStore'

const HANDLE_PX = 12

interface IGesture {
  kind: 'move' | 'resize'
  band: IBandName
  blockId: string
  start: IRect
  originX: number
  originY: number
}

function isBandName(value: string | null): value is IBandName {
  return !!value && (BAND_NAMES as readonly string[]).includes(value)
}

function sameRect(a: IRect, b: IRect): boolean {
  return a.xMm === b.xMm && a.yMm === b.yMm && a.widthMm === b.widthMm && a.heightMm === b.heightMm
}

export function Canvas({ store, assets }: { store: IEditorStore; assets: Record<string, string> }) {
  const surface = useRef<HTMLDivElement>(null)
  const pxPerMm = useSignal(0)
  const preview = useSignal<IRect | null>(null)
  const gesture = useRef<IGesture | null>(null)

  const doc = store.doc.value
  const sample = sampleDataFor(doc)

  useEffect(() => {
    const node = surface.current
    if (!node) return
    const measure = (): void => {
      const width = node.getBoundingClientRect().width
      if (width > 0) pxPerMm.value = width / usableWidthMm(store.doc.value.page)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    measure()
    return () => observer.disconnect()
  }, [])

  function beginGesture(
    kind: IGesture['kind'],
    band: IBandName,
    blockId: string,
    event: PointerEvent,
  ): void {
    const block = findBlock(store.doc.value, band, blockId)
    if (!block || pxPerMm.value <= 0) return
    gesture.current = {
      kind,
      band,
      blockId,
      start: { ...block },
      originX: event.clientX,
      originY: event.clientY,
    }
    preview.value = { ...block }
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  function onPointerDown(event: PointerEvent): void {
    const target = event.target as Element | null
    if (target?.closest('[data-resize-handle]')) {
      const band = store.selectedBand.value
      const blockId = store.selectedBlockId.value
      if (isBandName(band) && blockId) beginGesture('resize', band, blockId, event)
      return
    }
    const band = target?.closest('[data-band]')?.getAttribute('data-band') ?? null
    if (!isBandName(band)) {
      store.select(null, null)
      return
    }
    const blockId = target?.closest('[data-block]')?.getAttribute('data-block') ?? null
    store.select(band, blockId)
    if (blockId) beginGesture('move', band, blockId, event)
  }

  function nextRect(event: PointerEvent, active: IGesture): IRect {
    const deltaX = event.clientX - active.originX
    const deltaY = event.clientY - active.originY
    const band = bandBoxOf(store.doc.value, active.band)
    const apply = active.kind === 'move' ? movedRect : resizedRect
    return apply(active.start, deltaX, deltaY, pxPerMm.value, band)
  }

  function onPointerMove(event: PointerEvent): void {
    const active = gesture.current
    if (!active) return
    preview.value = nextRect(event, active)
  }

  function onPointerUp(event: PointerEvent): void {
    const active = gesture.current
    if (!active) return
    const rect = nextRect(event, active)
    gesture.current = null
    preview.value = null
    const current = findBlock(store.doc.value, active.band, active.blockId)
    if (!current || sameRect(current, rect)) return
    store.commit(setBlockRect(store.doc.value, active.band, active.blockId, rect))
  }

  return (
    <div
      ref={surface}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: 'relative',
        width: `${usableWidthMm(doc.page)}mm`,
        margin: '0 auto',
        background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,.2)',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {render({ doc, data: sample.data, items: [sample.item], assets })}
      <Selection store={store} preview={preview} surface={surface} />
    </div>
  )
}

interface ISelectionProps {
  store: IEditorStore
  preview: Signal<IRect | null>
  surface: { current: HTMLDivElement | null }
}

function Selection({ store, preview, surface }: ISelectionProps): VNode | null {
  const band = store.selectedBand.value
  const blockId = store.selectedBlockId.value
  const provisional = preview.value
  if (!band || !blockId || !surface.current) return null
  const block = findBlock(store.doc.value, band, blockId)
  if (!block) return null

  const bandNode = surface.current.querySelector(`[data-band="${band}"]`)
  if (!bandNode) return null
  const bandBox = bandNode.getBoundingClientRect()
  const surfaceBox = surface.current.getBoundingClientRect()
  const scale = bandBox.width / usableWidthMm(store.doc.value.page)
  const rect = provisional ?? block

  return (
    <div
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        outline: '1px solid #0a58ca',
        left: `${bandBox.left - surfaceBox.left + rect.xMm * scale}px`,
        top: `${bandBox.top - surfaceBox.top + rect.yMm * scale}px`,
        width: `${rect.widthMm * scale}px`,
        height: `${rect.heightMm * scale}px`,
      }}
    >
      <span
        data-resize-handle="true"
        style={{
          position: 'absolute',
          right: `${-HANDLE_PX / 2}px`,
          bottom: `${-HANDLE_PX / 2}px`,
          width: `${HANDLE_PX}px`,
          height: `${HANDLE_PX}px`,
          background: '#0a58ca',
          cursor: 'nwse-resize',
          pointerEvents: 'auto',
        }}
      />
    </div>
  )
}
