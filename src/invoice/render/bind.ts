import type { IDocument } from './document'

export const MISSING = Symbol('missing')

export type IResolved = string | number | boolean | typeof MISSING

export interface IBindingScope {
  data: Record<string, unknown>
  item?: unknown
  itemRoot: string
}

function segmentsOf(path: string): string[] {
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter((segment) => segment.length > 0)
}

function walk(root: unknown, segments: string[]): unknown {
  let current = root
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

export function resolvePath(root: unknown, path: string): IResolved {
  if (typeof path !== 'string' || path.length === 0) return MISSING
  const value = walk(root, segmentsOf(path))
  if (value === null || value === undefined) return MISSING
  if (typeof value === 'object') return MISSING
  return value as IResolved
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
