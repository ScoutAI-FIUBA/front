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
        body: JSON.stringify({
          email: dto.email,
          password: dto.password,
          full_name: dto.fullName,
        }),
      },
      { auth: false },
    )

    const result = await this.login({ email: dto.email, password: dto.password })
    setProfileFullName(result.user.id, dto.fullName)
    return {
      ...result,
      user: mapApiUser(
        {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          email_verified: result.user.emailVerified,
          full_name: dto.fullName,
        },
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

  async requestPasswordReset(email: string): Promise<void> {
    await apiJson<void>(
      '/auth/password/forgot',
      { method: 'POST', body: JSON.stringify({ email }) },
      { auth: false },
    )
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await apiJson<void>(
      '/auth/password/reset',
      { method: 'POST', body: JSON.stringify({ token, password }) },
      { auth: false },
    )
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiJson<void>('/auth/me/password', {
      method: 'PUT',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    })
  },

  async updateProfile(fullName: string): Promise<User> {
    const data = await apiJson<AuthUserResponse>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ full_name: fullName }),
    })
    return mapApiUser(data.user, fullName)
  },

  async sendEmailVerification(): Promise<void> {
    await apiJson<void>('/auth/email/verify/send', { method: 'POST' })
  },

  async confirmEmailVerification(token: string): Promise<User> {
    const data = await apiJson<AuthUserResponse>(
      '/auth/email/verify/confirm',
      { method: 'POST', body: JSON.stringify({ token }) },
      { auth: false },
    )
    return mapApiUser(data.user)
  },

  async loginWithGoogle(idToken: string): Promise<AuthResult> {
    const data = await apiJson<LoginResponse>(
      '/auth/oauth/google',
      { method: 'POST', body: JSON.stringify({ id_token: idToken }) },
      {
        auth: false,
        timeoutMs: LOGIN_REQUEST_TIMEOUT_MS,
        timeoutMessage: LOGIN_TIMEOUT_MESSAGE,
      },
    )
    return toAuthResult(data)
  },
}

export { getStoredToken } from './token.ts'
