import { tokenName } from '../document'
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
  render(block, ctx) {
    const dataUri = ctx.asset(tokenName(String(block.props.asset)))
    if (!dataUri) return null
    return (
      <img
        src={dataUri}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: String(block.props.fit),
        }}
      />
    )
  },
})
