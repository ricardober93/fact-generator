const HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i
const HEX_LONG = /^#[0-9a-f]{6}$/i
const HEX_ALPHA = /^#[0-9a-f]{8}$/i
const COLOR_FUNCTION = /^(rgb|rgba|hsl|hsla)\(/i

export function looksLikeColor(value: string): boolean {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (trimmed.length === 0) return false
  return (
    HEX_SHORT.test(trimmed) ||
    HEX_LONG.test(trimmed) ||
    HEX_ALPHA.test(trimmed) ||
    COLOR_FUNCTION.test(trimmed)
  )
}

export function hexValueOf(value: string): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  const short = HEX_SHORT.exec(trimmed)
  if (short)
    return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase()
  if (HEX_LONG.test(trimmed)) return trimmed.toLowerCase()
  if (HEX_ALPHA.test(trimmed)) return trimmed.slice(0, 7).toLowerCase()
  return null
}
