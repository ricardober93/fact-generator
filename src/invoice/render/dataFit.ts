import { missingRequiredPaths } from './bind'
import { DETAIL_ITEM_ROOT, type IDocument } from './document'

export interface IDataFit {
  missing: string[]
  orphan: string[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function leafPaths(value: unknown, prefix: string, found: string[]): void {
  if (!isPlainObject(value)) {
    if (prefix) found.push(prefix)
    return
  }
  const keys = Object.keys(value)
  if (keys.length === 0 && prefix) {
    found.push(prefix)
    return
  }
  for (const key of keys) {
    leafPaths(value[key], prefix ? `${prefix}.${key}` : key, found)
  }
}

function declaredPaths(doc: IDocument): Set<string> {
  return new Set(doc.dataSchema.map((entry) => entry.path))
}

function storedPaths(data: Record<string, unknown>, items: unknown[]): string[] {
  const found: string[] = []
  leafPaths(data ?? {}, '', found)
  for (const item of items ?? []) {
    leafPaths(item, DETAIL_ITEM_ROOT, found)
  }
  return [...new Set(found)]
}

export function dataFit(doc: IDocument, data: Record<string, unknown>, items: unknown[]): IDataFit {
  if (!doc || !Array.isArray(doc.dataSchema)) {
    throw new Error('dataFit requires a document with a dataSchema')
  }
  const declared = declaredPaths(doc)
  return {
    missing: missingRequiredPaths(doc, data ?? {}, items ?? [], DETAIL_ITEM_ROOT),
    orphan: storedPaths(data, items).filter((path) => !declared.has(path)),
  }
}

function isItemPath(path: string): boolean {
  return path === DETAIL_ITEM_ROOT || path.startsWith(`${DETAIL_ITEM_ROOT}.`)
}

export function completeItems(doc: IDocument, items: unknown[]): unknown[] {
  if (!doc || !Array.isArray(items)) return []
  return items.filter(
    (item) => !missingRequiredPaths(doc, {}, [item], DETAIL_ITEM_ROOT).some(isItemPath),
  )
}

export function templateAccepts(
  doc: IDocument,
  data: Record<string, unknown>,
  items: unknown[],
): boolean {
  if (!doc) return false
  return missingRequiredPaths(doc, data ?? {}, items ?? [], DETAIL_ITEM_ROOT).length === 0
}
