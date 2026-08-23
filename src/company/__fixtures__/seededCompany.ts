import { container } from '@wabot-dev/framework'
import { CompanyRepository } from '../app'

export const ACME = { nit: '900123456-7', name: 'Acme S.A.S.', address: 'Calle 1 #2-3' }

export async function seedCompany(): Promise<string> {
  const created = await container.resolve(CompanyRepository).createCompany(ACME)
  return created.id
}
