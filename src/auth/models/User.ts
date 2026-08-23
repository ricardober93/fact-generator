import { Entity, Password, type IEntityData } from '@wabot-dev/framework'

export type IUserRole = 'administrador' | 'cajero' | 'lectura'

export const USER_ROLES: readonly IUserRole[] = ['administrador', 'cajero', 'lectura']

export function isUserRole(value: unknown): value is IUserRole {
  return typeof value === 'string' && USER_ROLES.includes(value as IUserRole)
}

export interface IUserData extends IEntityData {
  email: string
  passwordHash: string
  name: string
  role: IUserRole
  companyIds: string[]
  disabled?: boolean
}

export class User extends Entity<IUserData> {
  get email(): string {
    return this.data.email
  }

  get name(): string {
    return this.data.name
  }

  get role(): IUserRole {
    return this.data.role
  }

  get companyIds(): string[] {
    return this.data.companyIds ?? []
  }

  get disabled(): boolean {
    return this.data.disabled === true
  }

  get isAdmin(): boolean {
    return this.role === 'administrador'
  }

  belongsTo(companyId: string): boolean {
    if (typeof companyId !== 'string' || companyId.length === 0) return false
    return this.companyIds.includes(companyId)
  }

  matches(password: unknown): boolean {
    if (typeof password !== 'string' || password.length === 0) return false
    return Password.isValid({ password, hash: this.data.passwordHash })
  }

  join(companyId: string): void {
    if (this.belongsTo(companyId)) return
    this.update({ companyIds: [...this.companyIds, companyId] })
  }

  changeRole(role: IUserRole): void {
    if (!isUserRole(role)) throw new Error('changeRole requires a known role')
    this.update({ role })
  }

  disable(): void {
    this.update({ disabled: true })
  }
}
