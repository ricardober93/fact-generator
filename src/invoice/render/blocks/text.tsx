import type { ITextContent, ITextFragment, ITextMark } from '../document'
import { formatValue } from '../format'
import { tokenVar } from '../printCss'
import { defineBlock, type IRenderContext } from './defineBlock'

function markStyle(marks: ITextMark[] | undefined): Record<string, string> {
  if (!marks || marks.length === 0) return {}
  return {
    fontWeight: marks.includes('bold') ? 'bold' : 'normal',
    fontStyle: marks.includes('italic') ? 'italic' : 'normal',
    textDecoration: marks.includes('underline') ? 'underline' : 'none',
  }
}

function fragmentText(fragment: ITextFragment, ctx: IRenderContext): string {
  if (fragment.type === 'literal') return fragment.text
  return formatValue(ctx.resolve(fragment.path), fragment.format, ctx.format)
}

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
  render(block, ctx) {
    const content = block.props.content as ITextContent
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          color: tokenVar(block.props.color),
          fontFamily: tokenVar(block.props.fontFamily),
          fontSize: tokenVar(block.props.fontSize),
          textAlign: String(block.props.align),
        }}
      >
        {content.fragments.map((fragment, index) => (
          <span key={index} style={markStyle(fragment.marks)}>
            {fragmentText(fragment, ctx)}
          </span>
        ))}
      </div>
    )
  },
})
