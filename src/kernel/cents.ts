const CENTS_PER_UNIT = 100

export function toCents(amount: unknown): number {
  const value = typeof amount === 'number' ? amount : Number(amount)
  if (!Number.isFinite(value)) return 0
  return Math.round(value * CENTS_PER_UNIT)
}

export function toUnits(cents: number): number {
  return cents / CENTS_PER_UNIT
}
