import { CrudRepository, CustomError, repository } from '@wabot-dev/framework'
import { Company, type ICompanyData } from './Company'

export type ICompanyInput = Omit<ICompanyData, keyof import('@wabot-dev/framework').IEntityData>

function invalid(humanMessage: string): CustomError {
  return new CustomError({
    message: 'Invalid company',
    humanMessage,
    code: 'INVALID_COMPANY',
    httpCode: 400,
  })
}

function assertInput(input: ICompanyInput): void {
  if (!input || typeof input.nit !== 'string' || input.nit.trim().length === 0) {
    throw invalid('La empresa necesita un NIT.')
  }
  if (typeof input.name !== 'string' || input.name.trim().length === 0) {
    throw invalid('La empresa necesita una razón social.')
  }
}

@repository({ table: 'company', constructor: Company })
export class CompanyRepository extends CrudRepository<Company> {
  declare findAll: () => Promise<Company[]>

  async createCompany(input: ICompanyInput): Promise<Company> {
    assertInput(input)
    const company = new Company({ ...input })
    await this.create(company)
    return company
  }

  async saveCompany(id: string, input: ICompanyInput): Promise<Company> {
    assertInput(input)
    const company = await this.find(id)
    if (!company) {
      throw new CustomError({
        message: 'Company not found',
        humanMessage: 'Esa empresa no existe.',
        code: 'COMPANY_NOT_FOUND',
        httpCode: 404,
      })
    }
    company.applyChanges(input)
    await this.update(company)
    return company
  }

  async current(): Promise<Company | null> {
    const all = await this.findAll()
    return all[0] ?? null
  }
}
