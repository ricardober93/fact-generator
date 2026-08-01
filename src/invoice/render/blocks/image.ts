import { defineBlock } from './defineBlock'

export default defineBlock({
  kind: 'image',
  schema: {
    asset: 'asset',
    fit: 'enum:contain,cover,fill',
  },
  defaults: {
    xMm: 0,
    yMm: 0,
    widthMm: 30,
    heightMm: 15,
    props: {
      asset: '@logo',
      fit: 'contain',
    },
  },
})
