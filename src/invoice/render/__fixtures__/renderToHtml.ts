import { container } from '@wabot-dev/framework'
import { UiRendererRegistry } from '@wabot-dev/framework/ui'

export async function renderToHtml(node: unknown): Promise<string> {
  const result = await container.resolve(UiRendererRegistry).get().renderToString(node)
  return result.html
}

export const INVOICE_DATA = {
  emisor: { nombre: 'Acme S.L.', pie: 'Gracias por su confianza' },
  cliente: { nombre: 'Ana Pérez' },
  factura: { numero: 'F-2026-014', total: 363, base: 300, impuestos: 63 },
}

export const INVOICE_ITEMS = [
  { descripcion: 'Diseño de marca', cantidad: 1, total: 120 },
  { descripcion: 'Maquetación', cantidad: 3, total: 63 },
  { descripcion: 'Fotografía', cantidad: 2, total: 180 },
]
