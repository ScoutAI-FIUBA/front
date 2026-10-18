import { simulateNetwork } from '@/mocks/delays'
import { getStore, updateStore, generateId } from '@/mocks/store'
import type { IAuthService, AuthResult } from '../contracts/auth.service'
import type { RegisterDto, User } from '@/types'
import { getStoredToken } from '../api/token'

function toSafeUser(user: User & { password: string }): User {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  }
}

function issue(user: User & { password: string }): AuthResult {
  const token = `mock-token-${user.id}`
  return { user: toSafeUser(user), token }
}

export const mockAuthService: IAuthService = {
  async login({ email, password }): Promise<AuthResult> {
    await simulateNetwork()
    const store = getStore()
    const user = store.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
    )
    if (!user) {
      throw new Error('Correo o contraseña incorrectos')
    }
    return issue(user)
  },

  async register(dto: RegisterDto): Promise<AuthResult> {
    await simulateNetwork()
    const exists = getStore().users.some(
      (u) => u.email.toLowerCase() === dto.email.toLowerCase(),
    )
    if (exists) throw new Error('El correo ya está registrado')

    updateStore((s) => {
      s.users.push({
        id: generateId('user'),
        email: dto.email,
        password: dto.password,
        fullName: dto.fullName,
        role: 'analyst',
        emailVerified: false,
        createdAt: new Date().toISOString(),
      })
    })

    return issue(getStore().users[getStore().users.length - 1])
  },

  async logout(): Promise<void> {
    await simulateNetwork(200)
  },

  async getCurrentUser(token: string): Promise<User | null> {
    await simulateNetwork(200)
    if (!token.startsWith('mock-token-')) return null
    const userId = token.replace('mock-token-', '')
    const user = getStore().users.find((u) => u.id === userId)
    if (!user) return null
    return toSafeUser(user)
  },

  async requestPasswordReset(email: string): Promise<void> {
    await simulateNetwork()
    void email
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await simulateNetwork()
    if (!token.startsWith('mock-reset-')) throw new Error('El enlace no es válido')
    const userId = token.replace('mock-reset-', '')
    updateStore((s) => {
      const user = s.users.find((u) => u.id === userId)
      if (user) user.password = password
    })
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await simulateNetwork()
    const token = getStoreTokenId()
    updateStore((s) => {
      const user = s.users.find((u) => u.id === token)
      if (!user || user.password !== currentPassword) {
        throw new Error('La contraseña actual es incorrecta')
      }
      user.password = newPassword
    })
  },

  async updateProfile(fullName: string): Promise<User> {
    await simulateNetwork()
    const token = getStoreTokenId()
    let updated: (User & { password: string }) | undefined
    updateStore((s) => {
      const user = s.users.find((u) => u.id === token)
      if (user) {
        user.fullName = fullName
        updated = user
      }
    })
    if (!updated) throw new Error('No se pudo actualizar el perfil')
    return toSafeUser(updated)
  },

  async sendEmailVerification(): Promise<void> {
    await simulateNetwork()
  },

  async confirmEmailVerification(token: string): Promise<User> {
    await simulateNetwork()
    if (!token.startsWith('mock-verify-')) throw new Error('El enlace no es válido')
    const userId = token.replace('mock-verify-', '')
    let updated: (User & { password: string }) | undefined
    updateStore((s) => {
      const user = s.users.find((u) => u.id === userId)
      if (user) {
        user.emailVerified = true
        updated = user
      }
    })
    if (!updated) throw new Error('El enlace no es válido')
    return toSafeUser(updated)
  },

  async loginWithGoogle(idToken: string): Promise<AuthResult> {
    await simulateNetwork()
    void idToken
    const user = getStore().users[0]
    if (!user) throw new Error('No hay un usuario de demo')
    return issue(user)
  },
}

function getStoreTokenId(): string {
  return (getStoredToken() ?? '').replace('mock-token-', '')
}

export { getStoredToken }
