import { emptyDocument, type IBlock, type IDocument, type ITextFragment } from '../document'
import { applyDefaults } from '../blocks/registry'

function textBlock(id: string, fragments: ITextFragment[], partial: Partial<IBlock>): IBlock {
  return applyDefaults('text', {
    ...partial,
    id,
    props: { ...(partial.props ?? {}), content: { fragments } },
  })
}

function literal(text: string): ITextFragment {
  return { type: 'literal', text }
}

function binding(path: string, format?: string): ITextFragment {
  return format ? { type: 'binding', path, format } : { type: 'binding', path }
}

export function invoiceDocumentFixture(): IDocument {
  const doc = emptyDocument()

  doc.params = [
    {
      name: 'color',
      type: 'string',
      token: 'primary',
      defaultValue: '#0a58ca',
    },
    {
      name: 'density',
      type: 'enum',
      token: 'fontSizeBase',
      defaultValue: '10pt',
      allowedValues: ['9pt', '10pt', '12pt'],
    },
  ]

  doc.bands.header.blocks = [
    applyDefaults('image', { id: 'logo', xMm: 0, yMm: 0, widthMm: 40, heightMm: 20 }),
    textBlock('issuer', [binding('emisor.nombre')], {
      xMm: 50,
      yMm: 0,
      widthMm: 80,
      heightMm: 8,
      props: { fontSize: '@fontSizeTitle', color: '@primary' },
    }),
    textBlock('customer', [literal('Cliente: '), binding('cliente.nombre')], {
      xMm: 0,
      yMm: 24,
      widthMm: 100,
      heightMm: 6,
    }),
    textBlock('number', [literal('Factura '), binding('factura.numero')], {
      xMm: 110,
      yMm: 24,
      widthMm: 70,
      heightMm: 6,
      props: { align: 'right' },
    }),
  ]

  doc.bands.detailHeader.blocks = [
    textBlock('colDescription', [literal('Descripción')], { xMm: 0, widthMm: 90, heightMm: 6 }),
    textBlock('colQuantity', [literal('Cant.')], { xMm: 95, widthMm: 20, heightMm: 6 }),
    textBlock('colTotal', [literal('Total')], {
      xMm: 130,
      widthMm: 50,
      heightMm: 6,
      props: { align: 'right' },
    }),
  ]

  doc.bands.detail.blocks = [
    textBlock('itemDescription', [binding('item.descripcion')], {
      xMm: 0,
      widthMm: 90,
      heightMm: 6,
    }),
    textBlock('itemQuantity', [binding('item.cantidad')], { xMm: 95, widthMm: 20, heightMm: 6 }),
    textBlock('itemTotal', [binding('item.total', 'currency')], {
      xMm: 130,
      widthMm: 50,
      heightMm: 6,
      props: { align: 'right' },
    }),
  ]

  doc.bands.summary.blocks = [
    applyDefaults('line', { id: 'summaryRule', xMm: 0, yMm: 2, widthMm: 180, heightMm: 0.2 }),
    textBlock('totalLabel', [literal('Total')], { xMm: 90, yMm: 8, widthMm: 40, heightMm: 8 }),
    textBlock('totalValue', [binding('factura.total', 'currency')], {
      xMm: 130,
      yMm: 8,
      widthMm: 50,
      heightMm: 8,
      props: { align: 'right', fontSize: '@fontSizeTitle', color: '@primary' },
    }),
  ]

  doc.bands.pageFooter.blocks = [
    textBlock('footerNote', [binding('emisor.pie')], {
      xMm: 0,
      yMm: 2,
      widthMm: 180,
      heightMm: 6,
      props: { color: '@muted', fontSize: '@fontSizeSmall' },
    }),
  ]

  return doc
}
