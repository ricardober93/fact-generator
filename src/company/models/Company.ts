import { Entity, type IEntityData } from '@wabot-dev/framework'

export interface ICompanyData extends IEntityData {
  nit: string
  name: string
  address?: string
  phone?: string
  email?: string
  web?: string
  tagline?: string
  taxRegime?: string
}

export type IIssuerFields = Record<string, string>

export class Company extends Entity<ICompanyData> {
  get nit(): string {
    return this.data.nit
  }

  get name(): string {
    return this.data.name
  }

  get address(): string {
    return this.data.address ?? ''
  }

  get taxRegime(): string {
    return this.data.taxRegime ?? ''
  }

  get issuerFields(): IIssuerFields {
    return {
      nit: this.data.nit,
      nombre: this.data.name,
      direccion: this.data.address ?? '',
      telefono: this.data.phone ?? '',
      email: this.data.email ?? '',
      web: this.data.web ?? '',
      eslogan: this.data.tagline ?? '',
      regimen: this.data.taxRegime ?? '',
    }
  }

  applyChanges(input: Omit<ICompanyData, keyof IEntityData>): void {
    this.update({
      nit: input.nit,
      name: input.name,
      address: input.address,
      phone: input.phone,
      email: input.email,
      web: input.web,
      tagline: input.tagline,
      taxRegime: input.taxRegime,
    })
  }
}
