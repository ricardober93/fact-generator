import { tokenVar } from '../printCss'
import { cellStyle, cellText, cellsOf, frameStyle, CELLS_STYLE_DEFAULTS } from './cells'
import { defineBlock } from './defineBlock'

export default defineBlock({
  kind: 'table',
  bands: ['detail'],
  schema: {
    cells: 'cells',
    color: 'token',
    headerColor: 'token',
    fontFamily: 'token',
    fontSize: 'token',
  },
  defaults: {
    xMm: 0,
    yMm: 0,
    widthMm: 180,
    heightMm: 6,
    props: {
      cells: [{ label: 'Columna', path: '', widthMm: 40, align: 'left' }],
      headerColor: CELLS_STYLE_DEFAULTS.color,
      ...CELLS_STYLE_DEFAULTS,
    },
  },
  render(block, ctx) {
    return (
      <div style={frameStyle(block, 'row')}>
        {cellsOf(block).map((cell, index) => (
          <div key={index} style={cellStyle(cell)}>
            {cellText(cell, ctx)}
          </div>
        ))}
      </div>
    )
  },
  renderHeader(block) {
    return (
      <div style={{ ...frameStyle(block, 'row'), color: tokenVar(block.props.headerColor) }}>
        {cellsOf(block).map((cell, index) => (
          <div key={index} style={{ ...cellStyle(cell), fontWeight: 'bold' }}>
            {cell.label}
          </div>
        ))}
      </div>
    )
  },
})
