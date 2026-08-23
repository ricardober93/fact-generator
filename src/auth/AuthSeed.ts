import { injectable } from '@wabot-dev/framework'
import { CompanyRepository } from '../company/app'
import { AuthCredentials } from './AuthCredentials'
import { UserRepository } from './models/UserRepository'

@injectable()
export class AuthSeed {
  constructor(
    private readonly users: UserRepository,
    private readonly companies: CompanyRepository,
    private readonly credentials: AuthCredentials,
  ) {}

  async ensureFirstAdmin(): Promise<void> {
    if (!(await this.users.isEmpty())) return
    const company = await this.companies.current()
    await this.users.createUser({
      email: this.credentials.email,
      password: this.credentials.password,
      name: this.credentials.email,
      role: 'administrador',
      companyIds: company ? [company.id] : [],
    })
  }
}
