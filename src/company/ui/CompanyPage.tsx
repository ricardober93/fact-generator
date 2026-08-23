import type { VNode } from '@wabot-dev/framework/ui'
import { SignOutButton } from '../../auth/ui/SignOutButton'
import type { Company } from '../models/Company'

interface IFieldProps {
  name: string
  label: string
  value: string
  required?: boolean
}

function Field({ name, label, value, required }: IFieldProps): VNode {
  return (
    <div class="stack-sm">
      <label for={`company-${name}`}>{label}</label>
      <input id={`company-${name}`} name={name} type="text" value={value} required={required} />
    </div>
  )
}

export function CompanyPage({ company }: { company: Company | null }): VNode {
  const fields = company ? company.issuerFields : {}
  return (
    <main class="container stack-lg">
      <div class="row">
        <h1>Empresa</h1>
        <span class="wb-toolbar-gap" />
        <a class="btn btn-ghost btn-sm" href="/invoices">
          Facturas
        </a>
        <SignOutButton />
      </div>

      {company ? null : (
        <p class="muted" data-no-company="true">
          Todavía no hay empresa emisora. Sin ella no se puede emitir ningún documento: una factura
          dice quién la emite.
        </p>
      )}

      <form class="card stack" method="post" action="/company/_action/save">
        <input type="hidden" name="id" value={company ? company.id : ''} />
        <Field name="nit" label="NIT" value={fields.nit ?? ''} required />
        <Field name="name" label="Razón social" value={company ? company.name : ''} required />
        <Field name="address" label="Dirección" value={fields.direccion ?? ''} />
        <Field name="phone" label="Teléfono" value={fields.telefono ?? ''} />
        <Field name="email" label="Correo" value={fields.email ?? ''} />
        <Field name="web" label="Web" value={fields.web ?? ''} />
        <Field name="tagline" label="Eslogan" value={fields.eslogan ?? ''} />
        <Field name="taxRegime" label="Régimen" value={fields.regimen ?? ''} />
        <button type="submit" class="btn">
          {company ? 'Guardar' : 'Crear empresa'}
        </button>
      </form>
    </main>
  )
}
