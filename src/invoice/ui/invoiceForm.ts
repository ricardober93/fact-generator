import { DETAIL_ITEM_ROOT, type IDataType, type IDocument } from '../render/document'
import { INVOICE_NUMBER_PATH } from '../render/invoiceFields'

export interface IFormField {
  path: string
  key: string
  label: string
  type: IDataType
  required: boolean
}

export interface IFormGroup {
  name: string
  fields: IFormField[]
}

export interface IFormShape {
  groups: IFormGroup[]
  columns: IFormField[]
}

function isItemPath(path: string): boolean {
  return path === DETAIL_ITEM_ROOT || path.startsWith(`${DETAIL_ITEM_ROOT}.`)
}

function segmentsOf(path: string): string[] {
  return path.split('.').filter((segment) => segment.length > 0)
}

function labelOf(path: string): string {
  const segments = segmentsOf(path)
  const tail = segments[segments.length - 1] ?? path
  return tail.charAt(0).toUpperCase() + tail.slice(1)
}

function fieldOf(path: string, type: IDataType, required: boolean, key: string): IFormField {
  return { path, key, label: labelOf(path), type, required }
}

function groupNameOf(path: string): string {
  return segmentsOf(path)[0] ?? path
}

function grouped(fields: IFormField[]): IFormGroup[] {
  const groups: IFormGroup[] = []
  for (const field of fields) {
    const name = groupNameOf(field.path)
    const existing = groups.find((group) => group.name === name)
    if (existing) existing.fields.push(field)
    else groups.push({ name, fields: [field] })
  }
  return groups
}

export function formShapeOf(doc: IDocument): IFormShape {
  if (!doc || !Array.isArray(doc.dataSchema)) {
    throw new Error('formShapeOf requires a document with a dataSchema')
  }
  const fields: IFormField[] = []
  const columns: IFormField[] = []
  for (const entry of doc.dataSchema) {
    if (!entry || typeof entry.path !== 'string' || entry.path.length === 0) continue
    if (entry.path === INVOICE_NUMBER_PATH) continue
    if (isItemPath(entry.path)) {
      const key = segmentsOf(entry.path).slice(1).join('.')
      if (key) columns.push(fieldOf(entry.path, entry.type, entry.required, key))
      continue
    }
    fields.push(fieldOf(entry.path, entry.type, entry.required, entry.path))
  }
  return { groups: grouped(fields), columns }
}
