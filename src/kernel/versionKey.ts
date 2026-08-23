import { createHash } from 'node:crypto'

const KEY_LENGTH = 16

export function versionKey(parts: unknown): string {
  if (parts === undefined) throw new Error('versionKey requires something to hash')
  return createHash('sha256')
    .update(JSON.stringify(parts) ?? 'undefined')
    .digest('hex')
    .slice(0, KEY_LENGTH)
}
