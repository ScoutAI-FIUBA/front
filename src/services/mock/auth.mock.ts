import { simulateNetwork } from '@/mocks/delays'
import { getStore, updateStore, generateId } from '@/mocks/store'
import type { IAuthService, AuthResult } from '../contracts/auth.service'
import type { RegisterDto, User } from '@/types'
import { clearStoredToken, setStoredToken } from '../api/token'

function toSafeUser(user: User & { password: string }): User {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    createdAt: user.createdAt,
  }
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
    const token = `mock-token-${user.id}`
    setStoredToken(token)
    return { user: toSafeUser(user), token }
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
        createdAt: new Date().toISOString(),
      })
    })

    const last = getStore().users[getStore().users.length - 1]
    const token = `mock-token-${last.id}`
    setStoredToken(token)
    return { user: toSafeUser(last), token }
  },

  async logout(): Promise<void> {
    await simulateNetwork(200)
    clearStoredToken()
  },

  async getCurrentUser(token: string): Promise<User | null> {
    await simulateNetwork(200)
    if (!token.startsWith('mock-token-')) return null
    const userId = token.replace('mock-token-', '')
    const user = getStore().users.find((u) => u.id === userId)
    if (!user) return null
    return toSafeUser(user)
  },
}

export { getStoredToken } from '../api/token'
