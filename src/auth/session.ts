export type { IUserRole } from './models/User'
import type { IUserRole } from './models/User'

export interface ISession {
  email: string
  userId: string
  role: IUserRole
  companyId: string
}
