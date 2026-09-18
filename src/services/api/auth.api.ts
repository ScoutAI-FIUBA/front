import type { IAuthService, AuthResult } from '../contracts/auth.service'
import type { RegisterDto, User } from '@/types'
import { apiJson } from './http-client.ts'
import { mapApiUser, setProfileFullName, type ApiUser } from './mappers.ts'
import { clearStoredToken, setStoredToken } from './token.ts'

export const LOGIN_REQUEST_TIMEOUT_MS = 60_000
export const LOGIN_TIMEOUT_MESSAGE =
  'El servidor está tardando más de lo habitual. Podés volver a intentarlo.'

interface AuthUserResponse {
  user: ApiUser
}

interface LoginResponse extends AuthUserResponse {
  access_token: string
  token_type: string
  expires_in: number
}

function toAuthResult(data: LoginResponse, fullNameOverride?: string): AuthResult {
  setStoredToken(data.access_token)
  return {
    token: data.access_token,
    user: mapApiUser(data.user, fullNameOverride),
  }
}

export const apiAuthService: IAuthService = {
  async login({ email, password }): Promise<AuthResult> {
    const data = await apiJson<LoginResponse>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      {
        auth: false,
        timeoutMs: LOGIN_REQUEST_TIMEOUT_MS,
        timeoutMessage: LOGIN_TIMEOUT_MESSAGE,
      },
    )
    return toAuthResult(data)
  },

  async register(dto: RegisterDto): Promise<AuthResult> {
    await apiJson<AuthUserResponse>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email: dto.email, password: dto.password }),
      },
      { auth: false },
    )

    const result = await this.login({ email: dto.email, password: dto.password })
    setProfileFullName(result.user.id, dto.fullName)
    return {
      ...result,
      user: mapApiUser(
        { id: result.user.id, email: result.user.email, role: result.user.role },
        dto.fullName,
      ),
    }
  },

  async logout(): Promise<void> {
    try {
      await apiJson<void>('/auth/logout', { method: 'POST' })
    } finally {
      clearStoredToken()
    }
  },

  async getCurrentUser(token: string): Promise<User | null> {
    if (!token) return null
    setStoredToken(token)
    try {
      const data = await apiJson<AuthUserResponse>('/auth/me')
      return mapApiUser(data.user)
    } catch {
      clearStoredToken()
      return null
    }
  },
}

export { getStoredToken } from './token.ts'
