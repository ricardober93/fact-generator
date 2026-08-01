import { defineBlock } from './defineBlock'

export default defineBlock({
  kind: 'text',
  schema: {
    content: 'text',
    color: 'token',
    fontFamily: 'token',
    fontSize: 'token',
    align: 'enum:left,center,right',
  },
  defaults: {
    xMm: 0,
    yMm: 0,
    widthMm: 60,
    heightMm: 6,
    props: {
      content: { fragments: [] },
      color: '@text',
      fontFamily: '@fontFamily',
      fontSize: '@fontSizeBase',
      align: 'left',
    },
  },
})
