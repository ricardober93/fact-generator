import { isNotEmpty, isOptional, isString } from '@wabot-dev/framework'
import {
  action,
  redirect,
  uiController,
  view,
  type UiRedirect,
  type VNode,
} from '@wabot-dev/framework/ui'
import { RequireSession } from '../auth/RequireSession'
import { AppLayout } from '../invoice/ui/AppLayout'
import { CompanyRepository } from './models/CompanyRepository'
import { CompanyPage } from './ui/CompanyPage'

export class SaveCompanyDto {
  @isOptional()
  @isString()
  id?: string

  @isString()
  @isNotEmpty()
  nit!: string

  @isString()
  @isNotEmpty()
  name!: string

  @isOptional()
  @isString()
  address?: string

  @isOptional()
  @isString()
  phone?: string

  @isOptional()
  @isString()
  email?: string

  @isOptional()
  @isString()
  web?: string

  @isOptional()
  @isString()
  tagline?: string

  @isOptional()
  @isString()
  taxRegime?: string
}

@uiController({ path: '/company', app: true, layout: AppLayout, middlewares: [RequireSession] })
export class CompanyController {
  constructor(private readonly companies: CompanyRepository) {}

  @view({ title: 'Empresa' })
  async index(): Promise<VNode> {
    return <CompanyPage company={await this.companies.current()} />
  }

  @action()
  async save(input: SaveCompanyDto): Promise<UiRedirect> {
    const fields = {
      nit: input.nit,
      name: input.name,
      address: input.address,
      phone: input.phone,
      email: input.email,
      web: input.web,
      tagline: input.tagline,
      taxRegime: input.taxRegime,
    }
    if (input.id) await this.companies.saveCompany(input.id, fields)
    else await this.companies.createCompany(fields)
    return redirect('/company')
  }
}
