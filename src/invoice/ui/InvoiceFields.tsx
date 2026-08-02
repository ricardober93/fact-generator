import type { VNode } from '@wabot-dev/framework/ui'
import type { IDataType } from '../render/document'
import type { IFormField, IFormGroup } from './invoiceForm'
import type { IFormValue } from './invoiceEdits'

const INPUT_TYPE: Record<IDataType, string> = {
  string: 'text',
  number: 'number',
  date: 'date',
  boolean: 'checkbox',
}

const GROUP_LABEL: Record<string, string> = {
  emisor: 'Tus datos',
  cliente: 'Cliente',
  factura: 'Factura',
}

function valueOf(raw: unknown): string {
  return raw === undefined || raw === null ? '' : String(raw)
}

function readEvent(field: IFormField, target: HTMLInputElement): IFormValue {
  if (field.type === 'boolean') return target.checked
  if (field.type === 'number') {
    return target.value === '' ? '' : Number(target.value)
  }
  return target.value
}

export function FieldControl({
  field,
  value,
  onChange,
}: {
  field: IFormField
  value: unknown
  onChange: (value: IFormValue) => void
}): VNode {
  const id = `field-${field.path.replace(/\./g, '-')}`
  return (
    <div class="wb-invoice-field">
      <label for={id}>
        {field.label}
        {field.required ? <span class="wb-required"> *</span> : null}
      </label>
      <input
        id={id}
        data-field={field.path}
        type={INPUT_TYPE[field.type]}
        required={field.required}
        checked={field.type === 'boolean' ? Boolean(value) : undefined}
        value={field.type === 'boolean' ? undefined : valueOf(value)}
        onInput={(event) => onChange(readEvent(field, event.currentTarget as HTMLInputElement))}
      />
    </div>
  )
}

export function InvoiceFields({
  groups,
  read,
  onChange,
}: {
  groups: IFormGroup[]
  read: (path: string) => unknown
  onChange: (path: string, value: IFormValue) => void
}): VNode {
  return (
    <>
      {groups.map((group) => (
        <fieldset key={group.name} class="stack-sm">
          <legend>{GROUP_LABEL[group.name] ?? group.name}</legend>
          {group.fields.map((field) => (
            <FieldControl
              key={field.path}
              field={field}
              value={read(field.path)}
              onChange={(value) => onChange(field.path, value)}
            />
          ))}
        </fieldset>
      ))}
    </>
  )
}
