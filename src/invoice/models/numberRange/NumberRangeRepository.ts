import { CrudRepository, CustomError, Locker, query, repository } from '@wabot-dev/framework'
import { isDocType, type IDocType } from '../docType'
import { NumberRange } from './NumberRange'

export interface ICreateNumberRangeInput {
  docType: IDocType
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
  if (!input || !isDocType(input.docType)) {
    throw invalid('Unknown document type', 'Ese tipo de documento no existe.')
  }
  if (typeof input.prefix !== 'string') {
    throw invalid('Range prefix must be a string', 'El prefijo no es válido.')
  }
  assertConsecutives(input.from, input.to)
  assertValidity(input.validFrom, input.validTo)
}

@repository({ table: 'numberRange', constructor: NumberRange })
export class NumberRangeRepository extends CrudRepository<NumberRange> {
  constructor(private readonly locker: Locker) {
    super()
  }

  @query() declare findByDocType: (docType: IDocType) => Promise<NumberRange[]>

  declare findAll: () => Promise<NumberRange[]>

  async createRange(input: ICreateNumberRangeInput): Promise<NumberRange> {
    assertInput(input)
    const key = `numberRange:${input.docType}:${input.prefix}`
    return this.locker.withKey(key).run(async () => {
      await this.assertNoOverlap(input)
      const range = new NumberRange({ ...input, next: input.from })
      await this.create(range)
      return range
    })
  }

  async findUsable(docType: IDocType, at: number): Promise<NumberRange[]> {
    if (!isDocType(docType)) return []
    const ranges = await this.findByDocType(docType)
    return ranges
      .filter((range) => range.usableAt(at))
      .sort((first, second) => first.from - second.from)
  }

  async findCovering(docType: IDocType, prefix: string, number: number): Promise<NumberRange[]> {
    if (!isDocType(docType) || typeof prefix !== 'string') return []
    const ranges = await this.findByDocType(docType)
    return ranges.filter((range) => range.prefix === prefix && range.covers(number))
  }

  private async assertNoOverlap(input: ICreateNumberRangeInput): Promise<void> {
    const siblings = await this.findByDocType(input.docType)
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
}
