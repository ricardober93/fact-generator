import { DETAIL_ITEM_ROOT, type IDataPath, type IDataType, type IDocument } from './document'

export interface ISampleInput {
  data: Record<string, unknown>
  item: Record<string, unknown>
}

const SAMPLE_BY_TYPE: Record<IDataType, () => string | number | boolean> = {
  string: () => 'Texto',
  number: () => 1234.56,
  boolean: () => true,
  date: () => '2026-01-31',
}

function sampleFor(type: IDataType): string | number | boolean {
  const make = SAMPLE_BY_TYPE[type]
  return make ? make() : 'Texto'
}

function assignPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split('.').filter((segment) => segment.length > 0)
  if (segments.length === 0) return
  let current = target
  for (const segment of segments.slice(0, -1)) {
    const existing = current[segment]
    if (typeof existing !== 'object' || existing === null) current[segment] = {}
    current = current[segment] as Record<string, unknown>
  }
  current[segments[segments.length - 1]] = value
}

function isItemPath(path: string): boolean {
  return path === DETAIL_ITEM_ROOT || path.startsWith(`${DETAIL_ITEM_ROOT}.`)
}

function itemPathTail(path: string): string {
  return path === DETAIL_ITEM_ROOT ? path : path.slice(DETAIL_ITEM_ROOT.length + 1)
}

export function sampleDataFor(doc: IDocument): ISampleInput {
  if (!doc || !Array.isArray(doc.dataSchema)) {
    throw new Error('sampleDataFor requires a document with a dataSchema')
  }
  const data: Record<string, unknown> = {}
  const item: Record<string, unknown> = {}
  for (const declared of doc.dataSchema as IDataPath[]) {
    if (!declared || typeof declared.path !== 'string') continue
    const value = sampleFor(declared.type)
    if (isItemPath(declared.path)) assignPath(item, itemPathTail(declared.path), value)
    else assignPath(data, declared.path, value)
  }
  return { data, item }
}
