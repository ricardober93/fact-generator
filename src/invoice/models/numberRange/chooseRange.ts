import type { NumberRange } from './NumberRange'

export type IRangeRejection =
  | 'NO_NUMBER_RANGE'
  | 'RANGE_EXHAUSTED'
  | 'RANGE_EXPIRED'
  | 'NUMBER_OUT_OF_RANGE'
  | 'AMBIGUOUS_PREFIX'

export type IRangeChoice =
  | { status: 'chosen'; range: NumberRange; number: number }
  | { status: 'rejected'; reason: IRangeRejection }

export interface IChooseRangeInput {
  ranges: NumberRange[]
  at: number
  number?: number
  prefix?: string
}

function byStart(first: NumberRange, second: NumberRange): number {
  return first.from - second.from
}

function whyNothingUsable(ranges: NumberRange[], at: number): IRangeRejection {
  if (ranges.length === 0) return 'NO_NUMBER_RANGE'
  if (ranges.some((range) => range.isValidAt(at))) return 'RANGE_EXHAUSTED'
  return 'RANGE_EXPIRED'
}

function samePrefix(ranges: NumberRange[]): boolean {
  return new Set(ranges.map((range) => range.prefix)).size <= 1
}

function chooseNext(ranges: NumberRange[], at: number): IRangeChoice {
  const usable = ranges.filter((range) => range.usableAt(at)).sort(byStart)
  if (usable.length === 0) return { status: 'rejected', reason: whyNothingUsable(ranges, at) }
  if (!samePrefix(usable)) return { status: 'rejected', reason: 'AMBIGUOUS_PREFIX' }
  const chosen = usable[0] as NumberRange
  return { status: 'chosen', range: chosen, number: chosen.next }
}

function chooseGiven(ranges: NumberRange[], at: number, number: number): IRangeChoice {
  const covering = ranges
    .filter((range) => range.isValidAt(at) && range.covers(number))
    .sort(byStart)
  if (covering.length === 0) return { status: 'rejected', reason: 'NUMBER_OUT_OF_RANGE' }
  if (!samePrefix(covering)) return { status: 'rejected', reason: 'AMBIGUOUS_PREFIX' }
  return { status: 'chosen', range: covering[0] as NumberRange, number }
}

export function chooseRange(input: IChooseRangeInput): IRangeChoice {
  if (!Number.isFinite(input.at)) throw new Error('chooseRange requires an instant')
  const all = Array.isArray(input.ranges) ? input.ranges : []
  const ranges = input.prefix === undefined ? all : all.filter((r) => r.prefix === input.prefix)
  if (input.number === undefined) return chooseNext(ranges, input.at)
  if (!Number.isInteger(input.number)) return { status: 'rejected', reason: 'NUMBER_OUT_OF_RANGE' }
  return chooseGiven(ranges, input.at, input.number)
}
