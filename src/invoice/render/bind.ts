import { MISSING, resolvePath, segmentsOf, type IResolved } from '../../kernel/paths'
import type { IDocument } from './document'

export interface IBindingScope {
  data: Record<string, unknown>
  item?: unknown
  itemRoot: string
}

export function resolveInScope(scope: IBindingScope, path: string): IResolved {
  const segments = segmentsOf(path)
  if (scope.item !== undefined && segments[0] === scope.itemRoot) {
    return resolvePath(scope.item, segments.slice(1).join('.'))
  }
  return resolvePath(scope.data, path)
}

export function missingRequiredPaths(
  doc: IDocument,
  data: Record<string, unknown>,
  items: unknown[],
  itemRoot: string,
): string[] {
  const missing: string[] = []
  for (const entry of doc.dataSchema) {
    if (!entry.required) continue
    const belongsToItem = segmentsOf(entry.path)[0] === itemRoot
    if (!belongsToItem) {
      if (resolvePath(data, entry.path) === MISSING) missing.push(entry.path)
      continue
    }
    const relative = segmentsOf(entry.path).slice(1).join('.')
    const missingInAnyItem = items.some((item) => resolvePath(item, relative) === MISSING)
    if (missingInAnyItem) missing.push(entry.path)
  }
  return missing
}
