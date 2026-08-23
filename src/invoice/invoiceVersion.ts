import { container } from '@wabot-dev/framework'
import { InvoiceRepository } from './models/invoice/InvoiceRepository'
import { TemplateRepository } from './models/template/TemplateRepository'
import { versionKey } from '../kernel/versionKey'

export async function versionOfInvoice({ id }: { id: string }): Promise<string> {
  const invoice = await container.resolve(InvoiceRepository).find(id)
  if (!invoice) return 'missing'
  const templates = await container.resolve(TemplateRepository).findAll()
  const chosen = templates.find((template) => template.id === invoice.templateId)
  return versionKey({
    data: invoice.invoiceData,
    items: invoice.invoiceItems,
    params: invoice.params,
    templateId: invoice.templateId,
    status: invoice.status,
    number: invoice.number,
    companyId: invoice.companyId,
    issuer: invoice.issuer,
    doc: chosen ? chosen.doc : null,
    pool: templates.map((template) => [template.id, template.name, template.rev]),
  })
}
