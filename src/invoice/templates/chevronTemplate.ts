import type { IBlock, ICell, IDocument, ITheme } from '../render/document'
import {
  binding,
  bold,
  boxBlock,
  chevronBlocks,
  lineBlock,
  literal,
  tableBlock,
  textBlock,
  verticalLineBlock,
} from './blockBuilders'
import { chevronHeaderBlocks } from './chevronHeader'
import { presetDocument } from './presetDocument'

const COLUMN_EDGES_MM = [30, 105, 130, 160]

const CELLS: ICell[] = [
  { label: 'No', path: 'item.numero', widthMm: 15, align: 'center' },
  { label: 'Item Description', path: 'item.descripcion', widthMm: 75, align: 'left' },
  { label: 'Qty', path: 'item.cantidad', widthMm: 25, align: 'center' },
  { label: 'Price', path: 'item.precio', format: 'currency', widthMm: 30, align: 'center' },
  { label: 'Total', path: 'item.total', format: 'currency', widthMm: 35, align: 'center' },
]

function detailBlocks(): IBlock[] {
  const grid = COLUMN_EDGES_MM.map((xMm, index) =>
    verticalLineBlock(
      `divider${index}`,
      { xMm, yMm: 0, widthMm: 0.2, heightMm: 9 },
      {
        color: '@gridLine',
      },
    ),
  )
  return [
    boxBlock(
      'rowFrame',
      { xMm: 15, yMm: 0, widthMm: 180, heightMm: 9 },
      {
        fill: '@rowFill',
        border: '@gridLine',
        borderWidthMm: 0.2,
      },
    ),
    ...grid,
    tableBlock('items', { xMm: 15, yMm: 0, widthMm: 180, heightMm: 9 }, CELLS, {
      color: '@text',
      headerColor: '@onAccent',
      fontSize: '@fontSizeSmall',
    }),
  ]
}

function totalRowBlocks(id: string, yMm: number, label: string, path: string): IBlock[] {
  return [
    boxBlock(`${id}Label`, { xMm: 120, yMm, widthMm: 35, heightMm: 8 }, { fill: '@accent' }),
    textBlock(`${id}Text`, { xMm: 120, yMm: yMm + 2, widthMm: 32, heightMm: 5 }, [bold(label)], {
      color: '@onAccent',
      fontSize: '@fontSizeSmall',
      align: 'right',
    }),
    boxBlock(
      `${id}Frame`,
      { xMm: 155, yMm, widthMm: 40, heightMm: 8 },
      {
        fill: '@rowFill',
        border: '@gridLine',
        borderWidthMm: 0.2,
      },
    ),
    textBlock(
      `${id}Value`,
      { xMm: 156, yMm: yMm + 2, widthMm: 37, heightMm: 5 },
      [binding(path, { format: 'currency' })],
      { fontSize: '@fontSizeSmall', align: 'right' },
    ),
  ]
}

function paymentInfoBlocks(): IBlock[] {
  const lines: [string, string, string][] = [
    ['account', 'Account #: ', 'factura.cuenta'],
    ['holder', 'A/C Name: ', 'factura.titular'],
    ['bank', 'Bank Details: ', 'factura.banco'],
  ]
  return [
    textBlock(
      'paymentLabel',
      { xMm: 15, yMm: 3, widthMm: 60, heightMm: 6 },
      [bold('Payment Info:')],
      { fontSize: '@fontSizeMd' },
    ),
    ...lines.map(([id, label, path], index) =>
      textBlock(
        id,
        { xMm: 15, yMm: 11 + index * 6, widthMm: 95, heightMm: 5 },
        [literal(label), binding(path)],
        { fontSize: '@fontSizeSmall' },
      ),
    ),
  ]
}

function contactBlocks(): IBlock[] {
  const contacts: [string, string, string][] = [
    ['phone', '☎', 'emisor.telefono'],
    ['address', '⌂', 'emisor.direccion'],
    ['mail', '✉', 'emisor.email'],
    ['website', '◎', 'emisor.web'],
  ]
  return contacts.map(([id, glyph, path], index) =>
    textBlock(
      id,
      { xMm: 15, yMm: 33 + index * 6, widthMm: 90, heightMm: 5 },
      [literal(`${glyph}   `), binding(path)],
      { fontSize: '@fontSizeSmall' },
    ),
  )
}

function summaryBlocks(): IBlock[] {
  return [
    ...paymentInfoBlocks(),
    ...totalRowBlocks('subTotal', 0, 'Sub Total', 'factura.base'),
    ...totalRowBlocks('tax', 8, 'Tax', 'factura.impuestos'),
    ...totalRowBlocks('grandTotal', 16, 'TOTAL', 'factura.total'),
    ...contactBlocks(),
    lineBlock('signRule', { xMm: 135, yMm: 52, widthMm: 60, heightMm: 0.3 }, { color: '@text' }),
    textBlock(
      'signLabel',
      { xMm: 135, yMm: 53.5, widthMm: 60, heightMm: 5 },
      [literal('Authorised Sign')],
      { fontSize: '@fontSizeSmall', align: 'center' },
    ),
  ]
}

export function chevronTemplate(theme: ITheme): IDocument {
  if (!theme || !theme.accent) throw new Error('chevronTemplate requires an accent token')
  const doc = presetDocument({
    theme,
    bandHeightsMm: { header: 72, detailHeader: 9, detail: 9, summary: 62, pageFooter: 26 },
  })
  doc.bands.header.blocks = chevronHeaderBlocks()
  doc.bands.detailHeader.blocks = [
    boxBlock('headerBar', { xMm: 15, yMm: 0, widthMm: 180, heightMm: 9 }, { fill: '@accent' }),
  ]
  doc.bands.detail.blocks = detailBlocks()
  doc.bands.summary.blocks = summaryBlocks()
  doc.bands.pageFooter.blocks = [
    ...chevronBlocks('footChevron', {
      tipXMm: 30,
      tipYMm: 13,
      sizeMm: 12,
      thicknessMm: 7,
      fill: '@accent',
    }),
    ...chevronBlocks('footChevronThin', {
      tipXMm: 17,
      tipYMm: 13,
      sizeMm: 12,
      thicknessMm: 3,
      fill: '@accent',
    }),
  ]
  return doc
}

export const CHEVRON_SLATE_THEME: ITheme = {
  accent: '#3c4655',
  onAccent: '#ffffff',
  text: '#2b2b2b',
  muted: '#7a808a',
  surface: '#ffffff',
  border: '#c9ced6',
  gridLine: '#b3bac4',
  rowFill: '#ffffff',
}

export const CHEVRON_AMBER_THEME: ITheme = { ...CHEVRON_SLATE_THEME, accent: '#fdb713' }
