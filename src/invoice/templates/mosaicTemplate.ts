import type { IBlock, ICell, IDocument, ITheme } from '../render/document'
import { binding, bold, boxBlock, lineBlock, literal, tableBlock, textBlock } from './blockBuilders'
import { mosaicHeaderBlocks } from './mosaicHeader'
import { presetDocument } from './presetDocument'

const CELLS: ICell[] = [
  { label: 'Serial', path: 'item.numero', widthMm: 25, align: 'center' },
  { label: 'Description', path: 'item.descripcion', widthMm: 60, align: 'left' },
  { label: 'Unit Price', path: 'item.precio', format: 'currency', widthMm: 35, align: 'right' },
  { label: 'Quantity', path: 'item.cantidad', widthMm: 25, align: 'center' },
  { label: 'Amount', path: 'item.total', format: 'currency', widthMm: 35, align: 'right' },
]

function totalRowBlocks(id: string, yMm: number, label: string, path: string): IBlock[] {
  return [
    textBlock(`${id}Label`, { xMm: 105, yMm, widthMm: 45, heightMm: 6 }, [literal(label)], {
      fontSize: '@fontSizeBase',
      color: '@ink',
    }),
    textBlock(
      `${id}Value`,
      { xMm: 150, yMm, widthMm: 45, heightMm: 6 },
      [binding(path, { format: 'currency' })],
      { fontSize: '@fontSizeBase', color: '@ink', align: 'right' },
    ),
  ]
}

function totalsBlocks(): IBlock[] {
  return [
    ...totalRowBlocks('subTotal', 2, 'Subtotal', 'factura.base'),
    lineBlock(
      'subTotalRule',
      { xMm: 105, yMm: 9, widthMm: 90, heightMm: 0.2 },
      {
        color: '@accentSoft',
      },
    ),
    ...totalRowBlocks('tax', 12, 'Taxes', 'factura.impuestos'),
    lineBlock(
      'taxRule',
      { xMm: 105, yMm: 19, widthMm: 90, heightMm: 0.2 },
      {
        color: '@accentSoft',
      },
    ),
    ...totalRowBlocks('grandTotal', 22, 'Total', 'factura.total'),
    lineBlock(
      'grandTotalRule',
      { xMm: 105, yMm: 29, widthMm: 90, heightMm: 0.8 },
      {
        color: '@accent',
      },
    ),
  ]
}

function summaryBlocks(): IBlock[] {
  return [
    textBlock(
      'termsLabel',
      { xMm: 15, yMm: 5, widthMm: 75, heightMm: 6 },
      [bold('Terms & Conditions')],
      { fontSize: '@fontSizeMd', color: '@ink' },
    ),
    textBlock(
      'terms',
      { xMm: 15, yMm: 14, widthMm: 80, heightMm: 15 },
      [binding('factura.condiciones')],
      { fontSize: '@fontSizeSmall', color: '@muted' },
    ),
    ...totalsBlocks(),
    textBlock(
      'thanks',
      { xMm: 15, yMm: 44, widthMm: 85, heightMm: 6 },
      [literal('Thank you for your business')],
      { fontSize: '@fontSizeBase', color: '@ink' },
    ),
    textBlock(
      'signature',
      { xMm: 140, yMm: 36, widthMm: 55, heightMm: 10 },
      [literal('Signature')],
      { fontSize: '@fontSizeXl', fontFamily: '@fontScript', align: 'center' },
    ),
    lineBlock('signRule', { xMm: 140, yMm: 49, widthMm: 55, heightMm: 0.3 }, { color: '@text' }),
    textBlock(
      'signLabel',
      { xMm: 140, yMm: 50.5, widthMm: 55, heightMm: 5 },
      [literal('Authorised Sign')],
      { fontSize: '@fontSizeSmall', align: 'center' },
    ),
  ]
}

export function mosaicTemplate(theme: ITheme): IDocument {
  if (!theme || !theme.accent) throw new Error('mosaicTemplate requires an accent token')
  const doc = presetDocument({
    theme,
    bandHeightsMm: { header: 128, detailHeader: 11, detail: 11, summary: 60, pageFooter: 12 },
  })
  doc.bands.header.blocks = mosaicHeaderBlocks()
  doc.bands.detailHeader.blocks = [
    boxBlock('headerBar', { xMm: 15, yMm: 0, widthMm: 180, heightMm: 11 }, { fill: '@accent' }),
  ]
  doc.bands.detail.blocks = [
    tableBlock('items', { xMm: 15, yMm: 0, widthMm: 180, heightMm: 10 }, CELLS, {
      color: '@text',
      headerColor: '@onAccent',
      fontSize: '@fontSizeSmall',
    }),
    lineBlock(
      'rowRule',
      { xMm: 15, yMm: 10.4, widthMm: 180, heightMm: 0.5 },
      {
        color: '@accentSoft',
      },
    ),
  ]
  doc.bands.summary.blocks = summaryBlocks()
  return doc
}

export const MOSAIC_RED_THEME: ITheme = {
  accent: '#e8402a',
  accentSoft: '#f4816f',
  mosaicDark: '#3b241f',
  mosaicMid: '#8c3a2a',
  mosaicPale: '#f9b7ab',
  ink: '#3a3a3a',
  onAccent: '#ffffff',
  text: '#3a3a3a',
  muted: '#8a8a8a',
  surface: '#ffffff',
  border: '#dddddd',
  fontScript: '"Segoe Script", "Brush Script MT", cursive',
}

export const MOSAIC_GREEN_THEME: ITheme = {
  ...MOSAIC_RED_THEME,
  accent: '#7ac143',
  accentSoft: '#aad97d',
  mosaicDark: '#2f2a1f',
  mosaicMid: '#4f7a2a',
  mosaicPale: '#cbe8ae',
}
