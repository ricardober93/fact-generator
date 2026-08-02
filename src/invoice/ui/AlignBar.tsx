import type { VNode } from '@wabot-dev/framework/ui'
import { alignBlocks, distributeBlocks, type IAlignment, type IAxis } from './arrange'
import { selectedBand, selectedBlockIds, type IEditorStore } from './editorStore'
import {
  AlignBottomIcon,
  AlignCenterXIcon,
  AlignLeftIcon,
  AlignMiddleIcon,
  AlignRightIcon,
  AlignTopIcon,
  DistributeXIcon,
  DistributeYIcon,
} from './icons'

const ALIGNMENTS: { alignment: IAlignment; label: string; Icon: () => VNode }[] = [
  { alignment: 'left', label: 'Alinear a la izquierda', Icon: AlignLeftIcon },
  { alignment: 'centerX', label: 'Centrar en horizontal', Icon: AlignCenterXIcon },
  { alignment: 'right', label: 'Alinear a la derecha', Icon: AlignRightIcon },
  { alignment: 'top', label: 'Alinear arriba', Icon: AlignTopIcon },
  { alignment: 'middle', label: 'Centrar en vertical', Icon: AlignMiddleIcon },
  { alignment: 'bottom', label: 'Alinear abajo', Icon: AlignBottomIcon },
]

const DISTRIBUTIONS: { axis: IAxis; label: string; Icon: () => VNode }[] = [
  { axis: 'x', label: 'Distribuir en horizontal', Icon: DistributeXIcon },
  { axis: 'y', label: 'Distribuir en vertical', Icon: DistributeYIcon },
]

export function AlignBar({ store }: { store: IEditorStore }): VNode | null {
  const band = selectedBand(store)
  const blockIds = selectedBlockIds(store)
  if (!band || blockIds.length < 2) return null

  return (
    <div class="wb-align" role="group" aria-label="Alinear y distribuir">
      {ALIGNMENTS.map(({ alignment, label, Icon }) => (
        <button
          key={alignment}
          type="button"
          class="wb-icon-button"
          data-align={alignment}
          aria-label={label}
          title={label}
          onClick={() => store.commit(alignBlocks(store.doc.value, band, blockIds, alignment))}
        >
          <Icon />
        </button>
      ))}
      {DISTRIBUTIONS.map(({ axis, label, Icon }) => (
        <button
          key={axis}
          type="button"
          class="wb-icon-button"
          data-distribute={axis}
          aria-label={label}
          title={label}
          disabled={blockIds.length < 3}
          onClick={() => store.commit(distributeBlocks(store.doc.value, band, blockIds, axis))}
        >
          <Icon />
        </button>
      ))}
    </div>
  )
}
