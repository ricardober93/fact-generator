export const MISSING = Symbol('missing')

export type IResolved = string | number | boolean | typeof MISSING

export function segmentsOf(path: string): string[] {
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

export function writePath<V>(source: Record<string, V>, path: string, value: V): Record<string, V> {
  const [head, ...rest] = segmentsOf(path)
  if (!head) return source
  if (rest.length === 0) return { ...source, [head]: value }
  const child = source[head]
  const isRecord = !!child && typeof child === 'object' && !Array.isArray(child)
  const branch = isRecord ? (child as Record<string, V>) : {}
  return { ...source, [head]: writePath(branch, rest.join('.'), value) as unknown as V }
}
