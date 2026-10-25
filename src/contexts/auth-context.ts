import { createContext, useContext } from 'react'
import type { RegisterDto, User, UserCredentials } from '@/types'

/** The auth context and its hook live apart from the provider component so Fast Refresh keeps working. */
export interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  sessionRestoreError: boolean
  lastAuthenticatedUserId: string | null
  sessionEndReason: 'expired' | 'logout' | null
  isAuthenticated: boolean
  retrySessionRestore: () => Promise<void>
  login: (credentials: UserCredentials) => Promise<User>
  register: (dto: RegisterDto) => Promise<User>
  loginWithGoogle: (idToken: string) => Promise<User>
  logout: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  updateProfile: (fullName: string) => Promise<void>
  sendEmailVerification: () => Promise<void>
  confirmEmailVerification: (token: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
