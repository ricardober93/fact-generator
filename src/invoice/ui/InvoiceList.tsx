import type { VNode } from '@wabot-dev/framework/ui'
import { SignOutButton } from '../../auth/ui/SignOutButton'
import type { Invoice } from '../models/invoice/Invoice'

const TYPE_LABELS: Record<string, string> = {
  factura: 'Factura',
  notaCredito: 'Nota de crédito',
}

export function InvoiceList({ invoices }: { invoices: Invoice[] }): VNode {
  return (
    <main class="container stack-lg">
      <div class="row">
        <h1>Facturas</h1>
        <span class="wb-toolbar-gap" />
        <SignOutButton />
      </div>

      {invoices.length === 0 ? (
        <p class="muted">Todavía no hay facturas.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Número</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => {
              const summary = invoice.summary
              return (
                <tr key={invoice.id} data-invoice={invoice.id} data-status={invoice.status}>
                  <td>{TYPE_LABELS[invoice.docType] ?? invoice.docType}</td>
                  <td>
                    <span class={invoice.issued ? 'badge badge-success' : 'badge'}>
                      {invoice.issued ? 'Emitida' : 'Borrador'}
                    </span>
                  </td>
                  <td>
                    <a href={`/invoices/${invoice.id}`}>{summary.numero || 'Sin número'}</a>
                  </td>
                  <td>{summary.cliente}</td>
                  <td>{summary.fecha}</td>
                  <td>{summary.total}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <div class="row">
        <a class="btn btn-sm" href="/invoices/new">
          Nueva factura
        </a>
        <a class="btn btn-secondary btn-sm" href="/ranges">
          Numeración
        </a>
      </div>
    </main>
  )
}
