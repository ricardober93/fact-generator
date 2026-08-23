import { isNotEmpty, isOptional, isString } from '@wabot-dev/framework'
import { RequireAdmin } from '../auth/RequireRole'
import {
  action,
  uiMiddleware,
  redirect,
  uiController,
  view,
  type UiRedirect,
  type VNode,
} from '@wabot-dev/framework/ui'
import { Auth } from '@wabot-dev/framework'
import { UserRepository } from '../auth/models/UserRepository'
import { RequireSession } from '../auth/RequireSession'
import type { ISession } from '../auth/session'
import { SessionCookie } from '../auth/SessionCookie'
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
  constructor(
    private readonly companies: CompanyRepository,
    private readonly users: UserRepository,
    private readonly session: SessionCookie,
    private readonly auth: Auth<ISession>,
  ) {}

  @view({ title: 'Empresa' })
  async index(): Promise<VNode> {
    return <CompanyPage company={await this.companies.current()} />
  }

  @action()
  @uiMiddleware(RequireAdmin)
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
    if (input.id) {
      await this.companies.saveCompany(input.id, fields)
      return redirect('/company')
    }
    const created = await this.companies.createCompany(fields)
    await this.joinAndActivate(created.id)
    return redirect('/company')
  }

  private async joinAndActivate(companyId: string): Promise<void> {
    if (!this.auth.isAssigned()) return
    const current = this.auth.require()
    const user = await this.users.find(current.userId)
    if (!user) return
    user.join(companyId)
    await this.users.update(user)
    await this.session.open({ ...current, companyId })
  }
}
