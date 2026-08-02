import type { VNode } from '@wabot-dev/framework/ui'
import { ZOOM_STEP, type IEditorStore } from './editorStore'
import { FitWidthIcon, ZoomInIcon, ZoomOutIcon } from './icons'

function fitZoom(): number | null {
  const stage = document.querySelector('.wb-stage')
  const paper = document.querySelector('.wb-paper')
  if (!(stage instanceof HTMLElement) || !(paper instanceof HTMLElement)) return null
  if (paper.offsetWidth <= 0) return null
  return stage.clientWidth / paper.offsetWidth
}

export function ZoomControls({ store }: { store: IEditorStore }): VNode {
  const zoom = store.zoom.value
  return (
    <div class="wb-zoom-controls" role="group" aria-label="Zoom">
      <button
        type="button"
        class="wb-icon-button"
        aria-label="Alejar"
        data-zoom="out"
        onClick={() => store.setZoom(zoom - ZOOM_STEP)}
      >
        <ZoomOutIcon />
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        aria-label="Tamaño real"
        data-zoom="actual"
        onClick={() => store.setZoom(1)}
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        class="wb-icon-button"
        aria-label="Acercar"
        data-zoom="in"
        onClick={() => store.setZoom(zoom + ZOOM_STEP)}
      >
        <ZoomInIcon />
      </button>
      <button
        type="button"
        class="wb-icon-button"
        aria-label="Encajar al ancho"
        data-zoom="fit"
        onClick={() => {
          const next = fitZoom()
          if (next) store.setZoom(next)
        }}
      >
        <FitWidthIcon />
      </button>
    </div>
  )
}
