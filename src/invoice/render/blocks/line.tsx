import { tokenVar } from '../printCss'
import { defineBlock } from './defineBlock'

export default defineBlock({
  kind: 'line',
  schema: {
    color: 'token',
    thicknessMm: 'number',
    orientation: 'enum:horizontal,vertical',
  },
  defaults: {
    xMm: 0,
    yMm: 0,
    widthMm: 40,
    heightMm: 0.2,
    props: {
      color: '@border',
      thicknessMm: 0.2,
      orientation: 'horizontal',
    },
  },
  render(block) {
    const isHorizontal = block.props.orientation === 'horizontal'
    const thickness = `${block.props.thicknessMm}mm`
    return (
      <div
        style={{
          width: isHorizontal ? '100%' : thickness,
          height: isHorizontal ? thickness : '100%',
          background: tokenVar(block.props.color),
        }}
      />
    )
  },
})
