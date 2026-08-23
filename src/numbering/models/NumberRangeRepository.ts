import { CrudRepository, CustomError, Locker, repository } from '@wabot-dev/framework'
import { chooseRange, type IRangeRejection } from './chooseRange'
import { NumberRange } from './NumberRange'

export interface ICreateNumberRangeInput {
  owner: string
  series: string
  prefix: string
  from: number
  to: number
  validFrom: number
  validTo: number
}

function invalid(message: string, humanMessage: string): CustomError {
  return new CustomError({
    message,
    humanMessage,
    code: 'INVALID_NUMBER_RANGE',
    httpCode: 400,
  })
}

function assertConsecutives(from: number, to: number): void {
  if (!Number.isInteger(from) || from < 1) {
    throw invalid('Range start must be a positive integer', 'El primer número no es válido.')
  }
  if (!Number.isInteger(to) || to < from) {
    throw invalid(
      `Range end ${to} is before its start ${from}`,
      'El último número no puede ser menor que el primero.',
    )
  }
}

function assertValidity(validFrom: number, validTo: number): void {
  if (!Number.isFinite(validFrom) || !Number.isFinite(validTo)) {
    throw invalid('Range validity must be two instants', 'La vigencia del rango no es válida.')
  }
  if (validTo < validFrom) {
    throw invalid('Range validity ends before it starts', 'La vigencia termina antes de empezar.')
  }
}

function assertInput(input: ICreateNumberRangeInput): void {
  if (!input || typeof input.owner !== 'string' || input.owner.length === 0) {
    throw invalid('A range must declare its owner', 'El rango tiene que tener dueño.')
  }
  if (typeof input.series !== 'string' || input.series.length === 0) {
    throw invalid('A range must declare its series', 'El rango tiene que declarar su serie.')
  }
  if (typeof input.prefix !== 'string') {
    throw invalid('Range prefix must be a string', 'El prefijo no es válido.')
  }
  assertConsecutives(input.from, input.to)
  assertValidity(input.validFrom, input.validTo)
}

export type IAssignRejection = IRangeRejection | 'NUMBER_ALREADY_USED'

export type IAssignment =
  | { status: 'assigned'; prefix: string; number: number }
  | { status: 'rejected'; reason: IAssignRejection }

export interface IAssignInput {
  owner: string
  series: string
  at: number
  prefix?: string
  number?: number
  isTaken: (prefix: string, number: number) => Promise<boolean>
}

@repository({ table: 'numberRange', constructor: NumberRange })
export class NumberRangeRepository extends CrudRepository<NumberRange> {
  constructor(private readonly locker: Locker) {
    super()
  }

  declare findAll: () => Promise<NumberRange[]>

  async createRange(input: ICreateNumberRangeInput): Promise<NumberRange> {
    assertInput(input)
    const key = `numberRange:${input.owner}:${input.series}:${input.prefix}`
    return this.locker.withKey(key).run(async () => {
      await this.assertNoOverlap(input)
      const range = new NumberRange({ ...input, next: input.from })
      await this.create(range)
      return range
    })
  }

  async findBySeries(owner: string, series: string): Promise<NumberRange[]> {
    if (typeof owner !== 'string' || owner.length === 0) return []
    if (typeof series !== 'string' || series.length === 0) return []
    const all = await this.findAll()
    return all.filter((range) => range.owner === owner && range.series === series)
  }

  async findUsable(owner: string, series: string, at: number): Promise<NumberRange[]> {
    const ranges = await this.findBySeries(owner, series)
    return ranges
      .filter((range) => range.usableAt(at))
      .sort((first, second) => first.from - second.from)
  }

  async findCovering(
    owner: string,
    series: string,
    prefix: string,
    number: number,
  ): Promise<NumberRange[]> {
    if (typeof prefix !== 'string') return []
    const ranges = await this.findBySeries(owner, series)
    return ranges.filter((range) => range.prefix === prefix && range.covers(number))
  }

  private async assertNoOverlap(input: ICreateNumberRangeInput): Promise<void> {
    const siblings = await this.findBySeries(input.owner, input.series)
    const clash = siblings.find(
      (range) => range.prefix === input.prefix && range.overlaps(input.from, input.to),
    )
    if (!clash) return
    throw new CustomError({
      message: `Range ${input.from}-${input.to} overlaps ${clash.from}-${clash.to}`,
      humanMessage: `Ese tramo se solapa con el rango ${clash.from}-${clash.to} que ya existe.`,
      code: 'OVERLAPPING_NUMBER_RANGE',
      httpCode: 409,
    })
  }

  async assign(input: IAssignInput): Promise<IAssignment> {
    const ranges = await this.findBySeries(input.owner, input.series)
    const choice = chooseRange({ ranges, at: input.at, number: input.number, prefix: input.prefix })
    if (choice.status === 'rejected') return { status: 'rejected', reason: choice.reason }
    return this.locker.withKey(`range:${choice.range.id}`).run(async () => {
      const range = await this.findOrThrow(choice.range.id)
      const fresh = chooseRange({
        ranges: [range],
        at: input.at,
        number: input.number,
        prefix: input.prefix,
      })
      if (fresh.status === 'rejected') return { status: 'rejected', reason: fresh.reason }
      if (await input.isTaken(range.prefix, fresh.number)) {
        return { status: 'rejected', reason: 'NUMBER_ALREADY_USED' }
      }
      range.advancePast(fresh.number)
      await this.update(range)
      return { status: 'assigned', prefix: range.prefix, number: fresh.number }
    })
  }
}
