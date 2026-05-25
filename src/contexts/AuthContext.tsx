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
import { getStoredToken } from '@/services/mock/auth.mock'

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: UserCredentials) => Promise<void>
  register: (dto: RegisterDto) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(getStoredToken())
  const [isLoading, setIsLoading] = useState(true)

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
          setToken(stored)
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

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
    setToken(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!user && !!token,
      login,
      register,
      logout,
    }),
    [user, token, isLoading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}



