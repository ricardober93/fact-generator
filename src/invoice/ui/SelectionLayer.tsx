import type { VNode } from '@wabot-dev/framework/ui'
import { usableWidthMm, type IBandName, type IDocument } from '../render/document'
import { boundsOf } from './arrange'
import { HANDLES, type IHandle, type IRect } from './geometry'
import type { IPreview } from './canvasGestures'

export interface IBandGeometry {
  leftPx: number
  topPx: number
  pxPerMm: number
}

export interface ISelectionLayerProps {
  doc: IDocument
  band: IBandName
  blockIds: string[]
  preview: IPreview | null
  geometry: IBandGeometry
}

const HANDLE_PX = 10

function handleOffset(handle: IHandle, rect: { widthPx: number; heightPx: number }) {
  const leftPx = handle.includes('w') ? 0 : handle.includes('e') ? rect.widthPx : rect.widthPx / 2
  const topPx = handle.includes('n') ? 0 : handle.includes('s') ? rect.heightPx : rect.heightPx / 2
  return { leftPx, topPx }
}

function rectsOf(doc: IDocument, band: IBandName, blockIds: string[], preview: IPreview | null) {
  return doc.bands[band].blocks
    .filter((block) => blockIds.includes(block.id))
    .map((block) => preview?.rects[block.id] ?? block)
}

function Handles({ widthPx, heightPx }: { widthPx: number; heightPx: number }): VNode {
  return (
    <>
      {HANDLES.map((handle) => {
        const offset = handleOffset(handle, { widthPx, heightPx })
        return (
          <span
            key={handle}
            data-resize-handle={handle}
            class="wb-handle"
            style={{
              left: `${offset.leftPx - HANDLE_PX / 2}px`,
              top: `${offset.topPx - HANDLE_PX / 2}px`,
              width: `${HANDLE_PX}px`,
              height: `${HANDLE_PX}px`,
            }}
          />
        )
      })}
    </>
  )
}

function Readout({ rect }: { rect: IRect }): VNode {
  return (
    <span class="wb-readout" data-readout="true">
      {Math.round(rect.xMm)}, {Math.round(rect.yMm)} · {Math.round(rect.widthMm)} ×{' '}
      {Math.round(rect.heightMm)} mm
    </span>
  )
}

function Guides({ preview, geometry, doc }: ISelectionLayerProps & { preview: IPreview }): VNode {
  const heightMm = doc.bands[preview.band].heightMm
  return (
    <>
      {preview.guides.map((guide, index) => (
        <span
          key={index}
          class="wb-guide"
          data-guide={guide.axis}
          style={
            guide.axis === 'x'
              ? {
                  left: `${geometry.leftPx + guide.positionMm * geometry.pxPerMm}px`,
                  top: `${geometry.topPx}px`,
                  width: '1px',
                  height: `${heightMm * geometry.pxPerMm}px`,
                }
              : {
                  left: `${geometry.leftPx}px`,
                  top: `${geometry.topPx + guide.positionMm * geometry.pxPerMm}px`,
                  width: `${usableWidthMm(doc.page) * geometry.pxPerMm}px`,
                  height: '1px',
                }
          }
        />
      ))}
    </>
  )
}

export function SelectionLayer(props: ISelectionLayerProps): VNode | null {
  const { doc, band, blockIds, preview, geometry } = props
  const rects = rectsOf(doc, band, blockIds, preview)
  const marquee = preview?.marquee ?? null
  if (rects.length === 0 && !marquee) return null
  const box = marquee ?? boundsOf(rects)
  const widthPx = box.widthMm * geometry.pxPerMm
  const heightPx = box.heightMm * geometry.pxPerMm
  return (
    <>
      {preview ? <Guides {...props} preview={preview} /> : null}
      <div
        class={marquee ? 'wb-marquee' : 'wb-selection'}
        data-selection={marquee ? 'marquee' : 'blocks'}
        style={{
          left: `${geometry.leftPx + box.xMm * geometry.pxPerMm}px`,
          top: `${geometry.topPx + box.yMm * geometry.pxPerMm}px`,
          width: `${widthPx}px`,
          height: `${heightPx}px`,
        }}
      >
        {!marquee && rects.length === 1 ? <Handles widthPx={widthPx} heightPx={heightPx} /> : null}
        {preview && !marquee ? <Readout rect={box} /> : null}
      </div>
    </>
  )
}
