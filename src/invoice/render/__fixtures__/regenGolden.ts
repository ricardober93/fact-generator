import { writeFileSync } from 'node:fs'
import { render } from '../render'
import { invoiceDocumentFixture } from './invoiceDocument'
import { INVOICE_DATA, INVOICE_ITEMS, renderToHtml } from './renderToHtml'

const html = await renderToHtml(
  render({
    doc: invoiceDocumentFixture(),
    data: INVOICE_DATA,
    items: INVOICE_ITEMS,
    assets: { logo: 'data:image/png;base64,AAAA' },
  }),
)

writeFileSync(new URL('./invoice.golden.html', import.meta.url), html + '\n')
