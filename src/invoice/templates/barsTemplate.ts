import type { IBlock, ICell, IDocument, ITheme } from '../render/document'
import {
  binding,
  bold,
  boxBlock,
  lineBlock,
  literal,
  tableBlock,
  textBlock,
  verticalLineBlock,
} from './blockBuilders'
import { barsHeaderBlocks } from './barsHeader'
import { presetDocument } from './presetDocument'

const CELLS: ICell[] = [
  { label: 'SL.', path: 'item.numero', widthMm: 20, align: 'center' },
  { label: 'Item description', path: 'item.descripcion', widthMm: 60, align: 'left' },
  { label: 'price', path: 'item.precio', format: 'currency', widthMm: 35, align: 'right' },
  { label: 'Qty.', path: 'item.cantidad', widthMm: 25, align: 'center' },
  { label: 'Total', path: 'item.total', format: 'currency', widthMm: 40, align: 'right' },
]

function pageFill(id: string, heightMm: number): IBlock {
  return boxBlock(id, { xMm: 0, yMm: 0, widthMm: 210, heightMm }, { fill: '@panel' })
}

function totalsBlocks(): IBlock[] {
  return [
    textBlock(
      'subTotalLabel',
      { xMm: 118, yMm: 4, widthMm: 37, heightMm: 6 },
      [bold('Sub total :')],
      { fontSize: '@fontSizeMd', color: '@ink' },
    ),
    textBlock(
      'subTotalValue',
      { xMm: 155, yMm: 4, widthMm: 40, heightMm: 6 },
      [binding('factura.base', { format: 'currency' })],
      { fontSize: '@fontSizeMd', align: 'right' },
    ),
    textBlock('taxLabel', { xMm: 118, yMm: 16, widthMm: 37, heightMm: 6 }, [bold('Tax :')], {
      fontSize: '@fontSizeMd',
      color: '@ink',
    }),
    textBlock(
      'taxValue',
      { xMm: 155, yMm: 16, widthMm: 40, heightMm: 6 },
      [binding('factura.impuestos', { format: 'currency' })],
      { fontSize: '@fontSizeMd', align: 'right' },
    ),
    boxBlock(
      'grandTotalBar',
      { xMm: 118, yMm: 28, widthMm: 92, heightMm: 11 },
      {
        fill: '@accent',
      },
    ),
    textBlock(
      'grandTotalLabel',
      { xMm: 121, yMm: 30.5, widthMm: 34, heightMm: 6 },
      [bold('Total:')],
      { fontSize: '@fontSizeMd', color: '@onAccent' },
    ),
    textBlock(
      'grandTotalValue',
      { xMm: 155, yMm: 30.5, widthMm: 40, heightMm: 6 },
      [binding('factura.total', { format: 'currency', marks: ['bold'] })],
      { fontSize: '@fontSizeMd', color: '@onAccent', align: 'right' },
    ),
  ]
}

function summaryBlocks(): IBlock[] {
  return [
    pageFill('summaryFill', 78),
    textBlock(
      'thanks',
      { xMm: 15, yMm: 4, widthMm: 95, heightMm: 7 },
      [literal('Thank you for your business')],
      { fontSize: '@fontSizeMd' },
    ),
    textBlock(
      'termsLabel',
      { xMm: 15, yMm: 16, widthMm: 95, heightMm: 6 },
      [bold('terms and conditions')],
      { fontSize: '@fontSizeMd', color: '@ink' },
    ),
    textBlock(
      'terms',
      { xMm: 15, yMm: 24, widthMm: 95, heightMm: 12 },
      [binding('factura.condiciones')],
      { fontSize: '@fontSizeSmall' },
    ),
    ...totalsBlocks(),
  ]
}

function footerBlocks(): IBlock[] {
  const contacts: [string, number, number, string][] = [
    ['footerPhone', 17, 25, 'emisor.telefono'],
    ['footerAddress', 50, 26, 'emisor.direccion'],
    ['footerWebsite', 84, 30, 'emisor.web'],
  ]
  return [
    pageFill('footerFill', 27),
    lineBlock(
      'footerRuleLeft',
      { xMm: 15, yMm: 13, widthMm: 80, heightMm: 0.3 },
      {
        color: '@ink',
      },
    ),
    lineBlock(
      'footerRuleRight',
      { xMm: 118, yMm: 13, widthMm: 77, heightMm: 0.3 },
      {
        color: '@ink',
      },
    ),
    ...contacts.map(([id, xMm, widthMm, path]) =>
      textBlock(id, { xMm, yMm: 16, widthMm, heightMm: 6 }, [binding(path)], {
        fontSize: '@fontSizeSmall',
      }),
    ),
    verticalLineBlock(
      'footerSeparatorA',
      { xMm: 46, yMm: 15, widthMm: 0.3, heightMm: 7 },
      {
        color: '@ink',
      },
    ),
    verticalLineBlock(
      'footerSeparatorB',
      { xMm: 80, yMm: 15, widthMm: 0.3, heightMm: 7 },
      {
        color: '@ink',
      },
    ),
    textBlock(
      'signLabel',
      { xMm: 118, yMm: 16, widthMm: 77, heightMm: 6 },
      [literal('Authorised sign')],
      { fontSize: '@fontSizeSmall', align: 'center' },
    ),
  ]
}

export function barsTemplate(theme: ITheme): IDocument {
  if (!theme || !theme.accent) throw new Error('barsTemplate requires an accent token')
  const doc = presetDocument({
    theme,
    bandHeightsMm: { header: 112, detailHeader: 16, detail: 16, summary: 78, pageFooter: 27 },
  })
  doc.bands.header.blocks = [pageFill('headerFill', 112), ...barsHeaderBlocks()]
  doc.bands.detailHeader.blocks = [
    pageFill('detailHeaderFill', 16),
    boxBlock('headerBar', { xMm: 15, yMm: 0, widthMm: 180, heightMm: 16 }, { fill: '@accent' }),
  ]
  doc.bands.detail.blocks = [
    pageFill('rowFill', 16),
    boxBlock('rowBand', { xMm: 15, yMm: 0, widthMm: 180, heightMm: 16 }, { fill: '@rowFill' }),
    tableBlock('items', { xMm: 15, yMm: 0, widthMm: 180, heightMm: 16 }, CELLS, {
      color: '@text',
      headerColor: '@onAccent',
      fontSize: '@fontSizeMd',
    }),
  ]
  doc.bands.summary.blocks = summaryBlocks()
  doc.bands.pageFooter.blocks = footerBlocks()
  return doc
}

export const BARS_NAVY_THEME: ITheme = {
  accent: '#f7941e',
  onAccent: '#ffffff',
  ink: '#2f3d50',
  onInk: '#ffffff',
  panel: '#f1f2f4',
  rowFill: '#ffffff',
  rowAltFill: '#e4e6e9',
  text: '#222222',
  muted: '#555555',
  surface: '#ffffff',
  border: '#d5d8dd',
}
