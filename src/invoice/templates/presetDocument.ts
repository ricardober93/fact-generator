import {
  emptyDocument,
  A4_PORTRAIT,
  type IBandName,
  type IDataPath,
  type IDocument,
  type ITheme,
} from '../render/document'

export const INVOICE_DATA_SCHEMA: IDataPath[] = [
  { path: 'emisor.nombre', type: 'string', required: true },
  { path: 'emisor.nit', type: 'string', required: false },
  { path: 'emisor.eslogan', type: 'string', required: false },
  { path: 'emisor.telefono', type: 'string', required: false },
  { path: 'emisor.direccion', type: 'string', required: false },
  { path: 'emisor.email', type: 'string', required: false },
  { path: 'emisor.web', type: 'string', required: false },
  { path: 'cliente.nombre', type: 'string', required: true },
  { path: 'cliente.direccion', type: 'string', required: false },
  { path: 'cliente.telefono', type: 'string', required: false },
  { path: 'factura.numero', type: 'string', required: true },
  { path: 'factura.fecha', type: 'date', required: false },
  { path: 'factura.cuenta', type: 'string', required: false },
  { path: 'factura.titular', type: 'string', required: false },
  { path: 'factura.banco', type: 'string', required: false },
  { path: 'factura.condiciones', type: 'string', required: false },
  { path: 'factura.base', type: 'number', required: false },
  { path: 'factura.impuestos', type: 'number', required: false },
  { path: 'factura.total', type: 'number', required: true },
  { path: 'item.numero', type: 'number', required: false },
  { path: 'item.descripcion', type: 'string', required: true },
  { path: 'item.precio', type: 'number', required: false },
  { path: 'item.cantidad', type: 'number', required: false },
  { path: 'item.total', type: 'number', required: true },
]

export const TYPE_SCALE: ITheme = {
  fontFamily: 'Helvetica, Arial, sans-serif',
  fontSizeXs: '6.5pt',
  fontSizeSmall: '8pt',
  fontSizeBase: '9.5pt',
  fontSizeMd: '11pt',
  fontSizeLg: '13pt',
  fontSizeXl: '16pt',
  fontSizeTitle: '21pt',
  fontSizeHero: '30pt',
}

export interface IPresetOptions {
  theme: ITheme
  bandHeightsMm: Record<IBandName, number>
  accentToken?: string
}

function assertOptions(options: IPresetOptions): void {
  if (!options || !options.theme) throw new Error('presetDocument requires a theme')
  if (!options.bandHeightsMm) throw new Error('presetDocument requires band heights')
}

export function presetDocument(options: IPresetOptions): IDocument {
  assertOptions(options)
  const accentToken = options.accentToken ?? 'accent'
  const doc = emptyDocument({
    ...A4_PORTRAIT,
    marginTopMm: 0,
    marginRightMm: 0,
    marginBottomMm: 0,
    marginLeftMm: 0,
  })
  doc.theme = { ...doc.theme, ...TYPE_SCALE, ...options.theme, currency: 'EUR' }
  doc.dataSchema = INVOICE_DATA_SCHEMA
  doc.params = [
    {
      name: 'color',
      type: 'string',
      token: accentToken,
      defaultValue: String(doc.theme[accentToken] ?? '#000000'),
    },
    {
      name: 'moneda',
      type: 'enum',
      token: 'currency',
      defaultValue: 'EUR',
      allowedValues: ['EUR', 'USD', 'COP', 'MXN'],
    },
  ]
  for (const [band, heightMm] of Object.entries(options.bandHeightsMm)) {
    doc.bands[band as IBandName].heightMm = heightMm
  }
  return doc
}
