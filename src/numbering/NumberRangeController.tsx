import { CustomError, isNotEmpty, isOptional, isString } from '@wabot-dev/framework'
import {
  action,
  redirect,
  uiController,
  view,
  type UiRedirect,
  type VNode,
} from '@wabot-dev/framework/ui'
import { RequireSession } from '../auth/RequireSession'
import { CompanyRepository } from '../company/app'
import { NumberRangeRepository } from './models/NumberRangeRepository'
import { AppLayout } from '../invoice/ui/AppLayout'
import { NumberRangePage } from './ui/NumberRangePage'

const DAY_MS = 24 * 60 * 60 * 1000

export class CreateRangeDto {
  @isString()
  @isNotEmpty()
  series!: string

  @isOptional()
  @isString()
  prefix?: string

  @isString()
  @isNotEmpty()
  from!: string

  @isString()
  @isNotEmpty()
  to!: string

  @isString()
  @isNotEmpty()
  validFrom!: string

  @isString()
  @isNotEmpty()
  validTo!: string
}

function badInput(humanMessage: string): CustomError {
  return new CustomError({
    message: 'Invalid number range input',
    humanMessage,
    code: 'INVALID_NUMBER_RANGE_INPUT',
    httpCode: 400,
  })
}

function asWhole(value: string, label: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) throw badInput(`${label} tiene que ser un entero.`)
  return parsed
}

function asDay(value: string, label: string, endOfDay = false): number {
  const parsed = Date.parse(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(parsed)) throw badInput(`${label} no es una fecha válida.`)
  return endOfDay ? parsed + DAY_MS - 1 : parsed
}

@uiController({ path: '/ranges', app: true, layout: AppLayout, middlewares: [RequireSession] })
export class NumberRangeController {
  constructor(
    private readonly ranges: NumberRangeRepository,
    private readonly companies: CompanyRepository,
  ) {}

  @view({ title: 'Numeración' })
  async index(): Promise<VNode> {
    return <NumberRangePage ranges={await this.ranges.findAll()} />
  }

  @action()
  async create(input: CreateRangeDto): Promise<UiRedirect> {
    const company = await this.companies.current()
    if (!company) throw badInput('Crea primero la empresa: un rango pertenece a un NIT.')
    await this.ranges.createRange({
      owner: company.id,
      series: input.series,
      prefix: input.prefix ?? '',
      from: asWhole(input.from, 'Desde'),
      to: asWhole(input.to, 'Hasta'),
      validFrom: asDay(input.validFrom, 'Vigente desde'),
      validTo: asDay(input.validTo, 'Vigente hasta', true),
    })
    return redirect('/ranges')
  }
}
