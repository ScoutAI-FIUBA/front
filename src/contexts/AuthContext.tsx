import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { RegisterDto, User, UserCredentials } from '@/types'
import { authService } from '@/services/registry'
import { getStoredToken, subscribeToStoredToken } from '@/services/api/token'

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: UserCredentials) => Promise<void>
  register: (dto: RegisterDto) => Promise<void>
  loginWithGoogle: (idToken: string) => Promise<void>
  logout: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  updateProfile: (fullName: string) => Promise<void>
  sendEmailVerification: () => Promise<void>
  confirmEmailVerification: (token: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(getStoredToken())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(
    () =>
      subscribeToStoredToken((nextToken) => {
        setToken(nextToken)
        if (!nextToken) setUser(null)
      }),
    [],
  )

  useEffect(() => {
    async function restore() {
      const stored = getStoredToken()
      if (!stored) {
        setIsLoading(false)
        return
      }
      try {
        const current = await authService.getCurrentUser(stored)
        if (current) {
          setUser(current)
          setToken(getStoredToken())
        } else {
          setToken(null)
        }
      } finally {
        setIsLoading(false)
      }
    }
    void restore()
  }, [])

  const login = useCallback(async (credentials: UserCredentials) => {
    const result = await authService.login(credentials)
    setUser(result.user)
    setToken(result.token)
  }, [])

  const register = useCallback(async (dto: RegisterDto) => {
    const result = await authService.register(dto)
    setUser(result.user)
    setToken(result.token)
  }, [])

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const result = await authService.loginWithGoogle(idToken)
    setUser(result.user)
    setToken(result.token)
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
    setToken(null)
  }, [])

  const requestPasswordReset = useCallback(async (email: string) => {
    await authService.requestPasswordReset(email)
  }, [])

  const resetPassword = useCallback(async (resetToken: string, password: string) => {
    await authService.resetPassword(resetToken, password)
  }, [])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await authService.changePassword(currentPassword, newPassword)
  }, [])

  const updateProfile = useCallback(async (fullName: string) => {
    const next = await authService.updateProfile(fullName)
    setUser(next)
  }, [])

  const sendEmailVerification = useCallback(async () => {
    await authService.sendEmailVerification()
  }, [])

  const confirmEmailVerification = useCallback(async (verifyToken: string) => {
    const next = await authService.confirmEmailVerification(verifyToken)
    setUser(next)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!user && !!token,
      login,
      register,
      loginWithGoogle,
      logout,
      requestPasswordReset,
      resetPassword,
      changePassword,
      updateProfile,
      sendEmailVerification,
      confirmEmailVerification,
    }),
    [
      user,
      token,
      isLoading,
      login,
      register,
      loginWithGoogle,
      logout,
      requestPasswordReset,
      resetPassword,
      changePassword,
      updateProfile,
      sendEmailVerification,
      confirmEmailVerification,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
