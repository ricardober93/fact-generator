import type { IBlock } from '../render/document'
import {
  binding,
  bold,
  boxBlock,
  decoration,
  imageBlock,
  literal,
  textBlock,
} from './blockBuilders'

const MOSAIC_FILLS = ['@accent', '@accentSoft', '@mosaicDark', '@mosaicMid', '@mosaicPale']
const MOSAIC_SHAPES = 66
const MOSAIC_HEIGHT_MM = 50

function pseudoRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function mosaicBlocks(): IBlock[] {
  const next = pseudoRandom(20260801)
  return [...Array(MOSAIC_SHAPES).keys()].map((index) => {
    const depth = next() ** 2.4
    const heightMm = 3.5 + (1 - depth) * 6 * (0.5 + next())
    const widthMm = heightMm * (1.1 + next())
    const spread = (index / MOSAIC_SHAPES) * 210 + (next() - 0.5) * 14
    const xMm = Math.min(Math.max(spread, 0), 210 - widthMm)
    const yMm = depth * (MOSAIC_HEIGHT_MM - heightMm)
    return decoration(
      boxBlock(
        `mosaic${index}`,
        { xMm, yMm, widthMm, heightMm },
        {
          fill: MOSAIC_FILLS[index % MOSAIC_FILLS.length],
          rotationDeg: Math.round(20 + next() * 50),
        },
      ),
    )
  })
}

function brandBlocks(): IBlock[] {
  return [
    textBlock('invoiceTitle', { xMm: 15, yMm: 60, widthMm: 100, heightMm: 15 }, [bold('INVOICE')], {
      fontSize: '@fontSizeHero',
      color: '@ink',
    }),
    textBlock(
      'enterprise',
      { xMm: 15, yMm: 76, widthMm: 100, heightMm: 7 },
      [binding('emisor.nombre')],
      { fontSize: '@fontSizeMd', color: '@ink' },
    ),
    textBlock(
      'numberLine',
      { xMm: 15, yMm: 85, widthMm: 100, heightMm: 5 },
      [literal('Invoice # '), binding('factura.numero', { marks: ['bold'] })],
      { fontSize: '@fontSizeSmall' },
    ),
    textBlock(
      'dateLine',
      { xMm: 15, yMm: 90.5, widthMm: 100, heightMm: 5 },
      [literal('Date '), binding('factura.fecha', { format: 'date', marks: ['bold'] })],
      { fontSize: '@fontSizeSmall' },
    ),
    imageBlock('logoMark', { xMm: 128, yMm: 60, widthMm: 16, heightMm: 15 }),
    textBlock('brand', { xMm: 146, yMm: 62, widthMm: 49, heightMm: 7 }, [bold('COMPANY LOGO')], {
      fontSize: '@fontSizeLg',
      color: '@ink',
    }),
    textBlock(
      'tagline',
      { xMm: 146, yMm: 70, widthMm: 49, heightMm: 4 },
      [binding('emisor.eslogan')],
      { fontSize: '@fontSizeXs', color: '@muted' },
    ),
  ]
}

function billToBlocks(): IBlock[] {
  return [
    textBlock(
      'customerName',
      { xMm: 15, yMm: 97, widthMm: 90, heightMm: 8 },
      [literal('To: ', ['bold']), binding('cliente.nombre', { marks: ['bold'] })],
      { fontSize: '@fontSizeLg', color: '@ink' },
    ),
    textBlock(
      'customerAddress',
      { xMm: 15, yMm: 107, widthMm: 90, heightMm: 5 },
      [literal('Location: '), binding('cliente.direccion')],
      { fontSize: '@fontSizeSmall' },
    ),
    textBlock(
      'customerPhone',
      { xMm: 15, yMm: 113, widthMm: 90, heightMm: 5 },
      [literal('Phone: '), binding('cliente.telefono')],
      { fontSize: '@fontSizeSmall' },
    ),
  ]
}

function paymentInfoBlocks(): IBlock[] {
  const lines: [string, string, string][] = [
    ['account', 'Account :', 'factura.cuenta'],
    ['holder', 'A/C Name:', 'factura.titular'],
    ['bank', 'Bank Details:', 'factura.banco'],
  ]
  return [
    textBlock(
      'paymentLabel',
      { xMm: 120, yMm: 97, widthMm: 75, heightMm: 7 },
      [bold('Payment Info:')],
      { fontSize: '@fontSizeMd', color: '@ink' },
    ),
    ...lines.flatMap(([id, label, path], index) => [
      textBlock(
        `${id}Label`,
        { xMm: 120, yMm: 108 + index * 5.5, widthMm: 26, heightMm: 4.5 },
        [literal(label)],
        { fontSize: '@fontSizeXs' },
      ),
      textBlock(
        `${id}Value`,
        { xMm: 147, yMm: 108 + index * 5.5, widthMm: 48, heightMm: 4.5 },
        [binding(path)],
        { fontSize: '@fontSizeXs' },
      ),
    ]),
  ]
}

export function mosaicHeaderBlocks(): IBlock[] {
  return [...mosaicBlocks(), ...brandBlocks(), ...billToBlocks(), ...paymentInfoBlocks()]
}
