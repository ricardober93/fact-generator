import { tokenVar } from '../printCss'
import { defineBlock } from './defineBlock'

export default defineBlock({
  kind: 'box',
  schema: {
    fill: 'token',
    border: 'token',
    borderWidthMm: 'number',
    radiusMm: 'number',
  },
  defaults: {
    xMm: 0,
    yMm: 0,
    widthMm: 40,
    heightMm: 20,
    props: {
      fill: '@surface',
      border: '@border',
      borderWidthMm: 0.2,
      radiusMm: 0,
    },
  },
  render(block) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: tokenVar(block.props.fill),
          border: `${block.props.borderWidthMm}mm solid ${tokenVar(block.props.border)}`,
          borderRadius: `${block.props.radiusMm}mm`,
        }}
      />
    )
  },
})
