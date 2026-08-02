import type { IBlock } from '../render/document'
import { binding, bold, boxBlock, chevronBlocks, imageBlock, textBlock } from './blockBuilders'

function brandBlocks(): IBlock[] {
  return [
    imageBlock('logoMark', { xMm: 15, yMm: 9, widthMm: 15, heightMm: 15 }),
    textBlock(
      'brand',
      { xMm: 32, yMm: 9, widthMm: 95, heightMm: 11 },
      [binding('emisor.nombre', { marks: ['bold'] })],
      { fontSize: '@fontSizeTitle', color: '@accent' },
    ),
    textBlock(
      'tagline',
      { xMm: 33, yMm: 20, widthMm: 95, heightMm: 5 },
      [binding('emisor.eslogan')],
      { fontSize: '@fontSizeXs', color: '@muted' },
    ),
  ]
}

function invoiceBadgeBlocks(): IBlock[] {
  return [
    ...chevronBlocks('cornerChevron', {
      tipXMm: 207,
      tipYMm: 12,
      sizeMm: 12,
      thicknessMm: 7,
      fill: '@accent',
    }),
    ...chevronBlocks('cornerChevronThin', {
      tipXMm: 194,
      tipYMm: 12,
      sizeMm: 12,
      thicknessMm: 3,
      fill: '@accent',
    }),
    boxBlock(
      'invoiceBadge',
      { xMm: 128, yMm: 30, widthMm: 67, heightMm: 15 },
      {
        fill: '@accent',
      },
    ),
    textBlock(
      'invoiceTitle',
      { xMm: 128, yMm: 33.5, widthMm: 67, heightMm: 9 },
      [bold('INVOICE')],
      { fontSize: '@fontSizeTitle', color: '@onAccent', align: 'center' },
    ),
  ]
}

function billToBlocks(): IBlock[] {
  return [
    textBlock(
      'billToLabel',
      { xMm: 15, yMm: 45, widthMm: 60, heightMm: 6 },
      [bold('Invoice to:')],
      { fontSize: '@fontSizeMd' },
    ),
    textBlock(
      'customerName',
      { xMm: 15, yMm: 52, widthMm: 85, heightMm: 7 },
      [binding('cliente.nombre', { marks: ['bold'] })],
      { fontSize: '@fontSizeLg' },
    ),
    textBlock(
      'customerAddress',
      { xMm: 15, yMm: 60, widthMm: 85, heightMm: 10 },
      [binding('cliente.direccion')],
      { fontSize: '@fontSizeSmall' },
    ),
  ]
}

function invoiceFactsBlocks(): IBlock[] {
  return [
    textBlock('numberLabel', { xMm: 105, yMm: 52, widthMm: 40, heightMm: 6 }, [bold('Invoice #')], {
      fontSize: '@fontSizeMd',
    }),
    textBlock(
      'numberValue',
      { xMm: 145, yMm: 52, widthMm: 50, heightMm: 6 },
      [binding('factura.numero', { marks: ['bold'] })],
      { fontSize: '@fontSizeMd', align: 'right' },
    ),
    textBlock('dateLabel', { xMm: 105, yMm: 60, widthMm: 40, heightMm: 6 }, [bold('Date')], {
      fontSize: '@fontSizeMd',
    }),
    textBlock(
      'dateValue',
      { xMm: 145, yMm: 60, widthMm: 50, heightMm: 6 },
      [binding('factura.fecha', { format: 'date', marks: ['bold'] })],
      { fontSize: '@fontSizeMd', align: 'right' },
    ),
  ]
}

export function chevronHeaderBlocks(): IBlock[] {
  return [...brandBlocks(), ...invoiceBadgeBlocks(), ...billToBlocks(), ...invoiceFactsBlocks()]
}
