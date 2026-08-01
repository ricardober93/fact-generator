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
})
