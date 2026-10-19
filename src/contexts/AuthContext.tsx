import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { RegisterDto, User, UserCredentials } from '@/types'
import { authService } from '@/services/registry'
import {
  getStoredSessionSnapshot,
  getStoredToken,
  invalidateStoredSession,
  isStoredSessionCurrent,
  startStoredSessionIfCurrent,
  subscribeToStoredSession,
  type StoredSessionSnapshot,
} from '@/services/api/token'
import { setAnalysisJobCatalogIdentity } from '@/pages/analysis/analysis-job-catalog-store'
import { setMatchPosterCacheIdentity } from '@/pages/matches/match-posters'
import { restoreSessionUser } from './session-restore'

interface AuthContextValue {
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

const AuthContext = createContext<AuthContextValue | null>(null)
const SUPERSEDED_AUTH_OPERATION = 'La operación de autenticación pertenece a una sesión anterior.'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialSession] = useState(() => getStoredSessionSnapshot())
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(initialSession.token)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionRestoreError, setSessionRestoreError] = useState(false)
  const [lastAuthenticatedUserId, setLastAuthenticatedUserId] = useState<string | null>(
    initialSession.userId,
  )
  const [sessionEndReason, setSessionEndReason] = useState<'expired' | 'logout' | null>(null)
  const restoreAttempt = useRef(0)

  const setAuthenticatedUser = useCallback((nextUser: User | null) => {
    const userId = nextUser?.id ?? null
    setAnalysisJobCatalogIdentity(userId)
    setMatchPosterCacheIdentity(userId)
    setUser(nextUser)
  }, [])

  useEffect(
    () =>
      subscribeToStoredSession((change) => {
        setToken(change.token)
        if (change.user && change.token && change.userId === change.user.id) {
          setAuthenticatedUser(change.user)
        } else if (!change.token || !change.userId) {
          setAuthenticatedUser(null)
        } else {
          setAnalysisJobCatalogIdentity(change.userId)
          setMatchPosterCacheIdentity(change.userId)
          setUser((current) => (current?.id === change.userId ? current : null))
        }

        if (change.reason === 'expired' || change.reason === 'logout') {
          setLastAuthenticatedUserId(change.previousUserId)
          setSessionEndReason(change.reason)
        } else {
          setLastAuthenticatedUserId(null)
          setSessionEndReason(null)
        }
      }),
    [setAuthenticatedUser],
  )

  const retrySessionRestore = useCallback(async () => {
    const attempt = restoreAttempt.current + 1
    restoreAttempt.current = attempt
    const operationSession = getStoredSessionSnapshot()
    setIsLoading(true)
    setSessionRestoreError(false)
    try {
      const current = await restoreSessionUser(() =>
        authService.getCurrentUser(getStoredToken() ?? ''),
      )
      if (
        restoreAttempt.current !== attempt ||
        getStoredSessionSnapshot().generation !== operationSession.generation
      ) return
      setAuthenticatedUser(current)
      setToken(getStoredToken())
    } catch {
      if (
        restoreAttempt.current === attempt &&
        getStoredSessionSnapshot().generation === operationSession.generation
      ) {
        setSessionRestoreError(true)
      }
    } finally {
      if (restoreAttempt.current === attempt) setIsLoading(false)
    }
  }, [setAuthenticatedUser])

  useEffect(() => {
    void retrySessionRestore()
  }, [retrySessionRestore])

  const establishSession = useCallback((
    expected: StoredSessionSnapshot,
    result: { user: User; token: string },
  ): User => {
    if (!startStoredSessionIfCurrent(expected, result.token, result.user.id, result.user)) {
      throw new Error(SUPERSEDED_AUTH_OPERATION)
    }
    setAuthenticatedUser(result.user)
    setToken(result.token)
    setSessionRestoreError(false)
    setLastAuthenticatedUserId(null)
    setSessionEndReason(null)
    return result.user
  }, [setAuthenticatedUser])

  const login = useCallback(async (credentials: UserCredentials): Promise<User> => {
    const expected = getStoredSessionSnapshot()
    const result = await authService.login(credentials)
    return establishSession(expected, result)
  }, [establishSession])

  const register = useCallback(async (dto: RegisterDto): Promise<User> => {
    const expected = getStoredSessionSnapshot()
    const result = await authService.register(dto)
    return establishSession(expected, result)
  }, [establishSession])

  const loginWithGoogle = useCallback(async (idToken: string): Promise<User> => {
    const expected = getStoredSessionSnapshot()
    const result = await authService.loginWithGoogle(idToken)
    return establishSession(expected, result)
  }, [establishSession])

  const logout = useCallback(async () => {
    restoreAttempt.current += 1
    const invalidatedSession = invalidateStoredSession('logout')
    setSessionRestoreError(false)
    setIsLoading(false)
    try {
      await authService.logout(invalidatedSession.token)
    } catch {
      // Local logout is authoritative. The backend logout middleware is tracked separately.
    }
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
    const operationSession = getStoredSessionSnapshot()
    const next = await authService.updateProfile(fullName)
    if (isStoredSessionCurrent(operationSession) && operationSession.userId === next.id) {
      setAuthenticatedUser(next)
    }
  }, [setAuthenticatedUser])

  const sendEmailVerification = useCallback(async () => {
    await authService.sendEmailVerification()
  }, [])

  const confirmEmailVerification = useCallback(async (verifyToken: string) => {
    const operationSession = getStoredSessionSnapshot()
    const next = await authService.confirmEmailVerification(verifyToken)
    if (isStoredSessionCurrent(operationSession) && operationSession.userId === next.id) {
      setUser((current) => (current ? { ...next, createdAt: current.createdAt } : current))
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      sessionRestoreError,
      lastAuthenticatedUserId,
      sessionEndReason,
      isAuthenticated: !!user && !!token,
      retrySessionRestore,
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
      sessionRestoreError,
      lastAuthenticatedUserId,
      sessionEndReason,
      retrySessionRestore,
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
