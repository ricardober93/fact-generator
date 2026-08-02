import type { IBlock } from '../render/document'
import { binding, bold, boxBlock, textBlock } from './blockBuilders'

function bannerBlocks(): IBlock[] {
  return [
    boxBlock('bannerBar', { xMm: 0, yMm: 15, widthMm: 134, heightMm: 30 }, { fill: '@ink' }),
    textBlock('invoiceTitle', { xMm: 14, yMm: 22, widthMm: 110, heightMm: 15 }, [bold('INVOICE')], {
      fontSize: '@fontSizeHero',
      color: '@onInk',
    }),
    boxBlock(
      'bannerAccentA',
      { xMm: 133, yMm: 20, widthMm: 17, heightMm: 29 },
      {
        fill: '@accent',
      },
    ),
    boxBlock('bannerInkB', { xMm: 150, yMm: 15, widthMm: 13, heightMm: 31 }, { fill: '@ink' }),
    boxBlock(
      'bannerAccentC',
      { xMm: 163, yMm: 10, widthMm: 16, heightMm: 31 },
      {
        fill: '@accent',
      },
    ),
    boxBlock('bannerInkD', { xMm: 179, yMm: 15, widthMm: 31, heightMm: 31 }, { fill: '@ink' }),
    boxBlock('bannerRuleInk', { xMm: 0, yMm: 52, widthMm: 59, heightMm: 3 }, { fill: '@ink' }),
    boxBlock(
      'bannerRuleAccent',
      { xMm: 59, yMm: 52, widthMm: 39, heightMm: 3 },
      {
        fill: '@accent',
      },
    ),
  ]
}

function billToBlocks(): IBlock[] {
  return [
    textBlock('logoText', { xMm: 110, yMm: 62, widthMm: 81, heightMm: 9 }, [bold('LOGO HERE')], {
      fontSize: '@fontSizeXl',
      color: '@accent',
      align: 'right',
    }),
    textBlock(
      'billToLabel',
      { xMm: 15, yMm: 75, widthMm: 85, heightMm: 8 },
      [bold('INVOICE  TO :')],
      { fontSize: '@fontSizeLg', color: '@ink' },
    ),
    textBlock(
      'customerName',
      { xMm: 15, yMm: 86, widthMm: 90, heightMm: 7 },
      [binding('cliente.nombre')],
      { fontSize: '@fontSizeMd' },
    ),
    textBlock(
      'customerAddress',
      { xMm: 15, yMm: 94, widthMm: 95, heightMm: 12 },
      [binding('cliente.direccion')],
      { fontSize: '@fontSizeMd' },
    ),
  ]
}

function invoiceFactsBlocks(): IBlock[] {
  return [
    textBlock('numberLabel', { xMm: 110, yMm: 85, widthMm: 40, heightMm: 7 }, [bold('invoice')], {
      fontSize: '@fontSizeMd',
      color: '@ink',
    }),
    textBlock(
      'numberValue',
      { xMm: 150, yMm: 85, widthMm: 41, heightMm: 7 },
      [binding('factura.numero', { marks: ['bold'] })],
      { fontSize: '@fontSizeMd', color: '@ink', align: 'right' },
    ),
    textBlock('dateLabel', { xMm: 110, yMm: 94, widthMm: 40, heightMm: 7 }, [bold('Date')], {
      fontSize: '@fontSizeMd',
      color: '@ink',
    }),
    textBlock(
      'dateValue',
      { xMm: 150, yMm: 94, widthMm: 41, heightMm: 7 },
      [binding('factura.fecha', { format: 'date', marks: ['bold'] })],
      { fontSize: '@fontSizeMd', color: '@ink', align: 'right' },
    ),
  ]
}

export function barsHeaderBlocks(): IBlock[] {
  return [...bannerBlocks(), ...billToBlocks(), ...invoiceFactsBlocks()]
}
