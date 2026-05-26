import { simulateNetwork } from '@/mocks/delays'
import { getStore, updateStore, generateId } from '@/mocks/store'
import type { IAuthService, AuthResult } from '../contracts/auth.service'
import type { RegisterDto, User } from '@/types'
import { clearStoredToken, setStoredToken } from '../api/token'

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
    const { password: _, ...safeUser } = user
    const token = `mock-token-${user.id}`
    setStoredToken(token)
    return { user: safeUser, token }
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
    const { password: _, ...safeUser } = last
    const token = `mock-token-${last.id}`
    setStoredToken(token)
    return { user: safeUser, token }
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
    const { password: _, ...safeUser } = user
    return safeUser
  },
}

export { getStoredToken } from '../api/token'
