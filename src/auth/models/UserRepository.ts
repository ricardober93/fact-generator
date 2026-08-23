import { CrudRepository, CustomError, Password, query, repository } from '@wabot-dev/framework'
import { isUserRole, User, type IUserRole } from './User'

export interface ICreateUserInput {
  email: string
  password: string
  name: string
  role: IUserRole
  companyIds?: string[]
}

function invalid(humanMessage: string): CustomError {
  return new CustomError({
    message: 'Invalid user',
    humanMessage,
    code: 'INVALID_USER',
    httpCode: 400,
  })
}

function normalized(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

@repository({ table: 'user', constructor: User })
export class UserRepository extends CrudRepository<User> {
  @query() declare findOneByEmail: (email: string) => Promise<User | null>

  declare findAll: () => Promise<User[]>

  async createUser(input: ICreateUserInput): Promise<User> {
    const email = normalized(input?.email)
    if (email.length === 0) throw invalid('El usuario necesita un correo.')
    if (typeof input.password !== 'string' || input.password.length === 0) {
      throw invalid('El usuario necesita una contraseña.')
    }
    if (!isUserRole(input.role)) throw invalid('Ese rol no existe.')
    if (await this.findOneByEmail(email)) throw invalid('Ese correo ya está en uso.')
    const user = new User({
      email,
      passwordHash: Password.hash({ password: input.password }),
      name: typeof input.name === 'string' && input.name.length > 0 ? input.name : email,
      role: input.role,
      companyIds: input.companyIds ?? [],
    })
    await this.create(user)
    return user
  }

  async authenticate(email: unknown, password: unknown): Promise<User | null> {
    const found = await this.findOneByEmail(normalized(email))
    if (!found || found.disabled) return null
    return found.matches(password) ? found : null
  }

  async countAdmins(companyId: string): Promise<number> {
    const all = await this.findAll()
    return all.filter((user) => user.isAdmin && !user.disabled && user.belongsTo(companyId)).length
  }

  async changeRole(userId: string, role: IUserRole, companyId: string): Promise<User> {
    const user = await this.findOrThrow(userId)
    if (!isUserRole(role)) throw invalid('Ese rol no existe.')
    if (user.isAdmin && role !== 'administrador') await this.assertNotLastAdmin(user, companyId)
    user.changeRole(role)
    await this.update(user)
    return user
  }

  async disableUser(userId: string, companyId: string): Promise<User> {
    const user = await this.findOrThrow(userId)
    if (user.isAdmin) await this.assertNotLastAdmin(user, companyId)
    user.disable()
    await this.update(user)
    return user
  }

  private async assertNotLastAdmin(user: User, companyId: string): Promise<void> {
    if (!user.belongsTo(companyId)) return
    if ((await this.countAdmins(companyId)) > 1) return
    throw new CustomError({
      message: 'The last administrator cannot be removed',
      humanMessage:
        'Es el último administrador de la empresa: si se queda sin ninguno, nadie podrá volver a crear usuarios ni rangos.',
      code: 'LAST_ADMIN',
      httpCode: 409,
    })
  }

  async isEmpty(): Promise<boolean> {
    return (await this.findAll()).length === 0
  }
}
