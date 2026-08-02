const CENTS_PER_UNIT = 100

function toCents(amount: unknown): number {
  const value = typeof amount === 'number' ? amount : Number(amount)
  if (!Number.isFinite(value)) return 0
  return Math.round(value * CENTS_PER_UNIT)
}

function toUnits(cents: number): number {
  return cents / CENTS_PER_UNIT
}

function toFactor(quantity: unknown): number {
  const value = typeof quantity === 'number' ? quantity : Number(quantity)
  return Number.isFinite(value) ? value : 0
}

export function lineAmount(quantity: unknown, price: unknown): number {
  return toUnits(Math.round(toCents(price) * toFactor(quantity)))
}

export function sumAmounts(amounts: unknown[]): number {
  if (!Array.isArray(amounts)) return 0
  return toUnits(amounts.reduce((total: number, amount) => total + toCents(amount), 0))
}

export function grandTotal(base: unknown, taxes: unknown): number {
  return toUnits(toCents(base) + toCents(taxes))
}
