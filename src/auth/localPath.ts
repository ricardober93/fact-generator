const SPACE_CODE = 0x20
const DELETE_CODE = 0x7f

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    if (code < SPACE_CODE || code === DELETE_CODE) return true
  }
  return false
}

export function isLocalPath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false
  if (!value.startsWith('/')) return false
  if (hasControlCharacter(value)) return false
  const second = value.charAt(1)
  return second !== '/' && second !== '\\'
}

export function localPathOr(target: unknown, fallback: string): string {
  if (typeof fallback !== 'string' || fallback.length === 0) {
    throw new Error('localPathOr requires a fallback path')
  }
  return isLocalPath(target) ? target : fallback
}

export function loginPathFor(target: unknown): string {
  if (!isLocalPath(target)) return '/login'
  return `/login?next=${encodeURIComponent(target)}`
}
