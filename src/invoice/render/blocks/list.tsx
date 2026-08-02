import { cellText, cellsOf, frameStyle, CELLS_STYLE_DEFAULTS } from './cells'
import { defineBlock } from './defineBlock'

export default defineBlock({
  kind: 'list',
  schema: {
    cells: 'cells',
    color: 'token',
    fontFamily: 'token',
    fontSize: 'token',
  },
  defaults: {
    xMm: 0,
    yMm: 0,
    widthMm: 70,
    heightMm: 18,
    props: {
      cells: [{ label: 'Etiqueta', path: '', widthMm: 30, align: 'right' }],
      ...CELLS_STYLE_DEFAULTS,
    },
  },
  render(block, ctx) {
    return (
      <div style={frameStyle(block, 'column')}>
        {cellsOf(block).map((cell, index) => (
          <div key={index} style={{ display: 'flex', flex: '1 1 0', overflow: 'hidden' }}>
            <span style={{ flex: `0 0 ${cell.widthMm}mm`, whiteSpace: 'nowrap' }}>
              {cell.label}
            </span>
            <span style={{ flex: '1 1 auto', textAlign: cell.align, whiteSpace: 'nowrap' }}>
              {cellText(cell, ctx)}
            </span>
          </div>
        ))}
      </div>
    )
  },
})
