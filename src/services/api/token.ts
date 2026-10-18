import type { User } from '@/types'

const TOKEN_KEY = 'scoutai-auth-token'
const USER_ID_KEY = 'scoutai-auth-user-id'

export type SessionChangeReason =
  | 'authenticated'
  | 'refreshed'
  | 'restored'
  | 'expired'
  | 'logout'

export interface StoredSessionSnapshot {
  token: string | null
  userId: string | null
  generation: number
}

export interface StoredSessionChange extends StoredSessionSnapshot {
  previousUserId: string | null
  reason: SessionChangeReason
  user?: User
}

type SessionChangeListener = (change: StoredSessionChange) => void
type TokenChangeListener = (token: string | null) => void

const sessionChangeListeners = new Set<SessionChangeListener>()
let sessionGeneration = 0

function storedToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

function storedUserId(): string | null {
  return sessionStorage.getItem(USER_ID_KEY)
}

function tokenSubject(token: string | null): string | null {
  if (!token) return null
  const payload = token.split('.')[1]
  if (!payload) return null

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const decoded = JSON.parse(atob(normalized)) as { sub?: unknown }
    return typeof decoded.sub === 'string' && decoded.sub ? decoded.sub : null
  } catch {
    return null
  }
}

function persistSession(token: string | null, userId: string | null): void {
  if (token) sessionStorage.setItem(TOKEN_KEY, token)
  else sessionStorage.removeItem(TOKEN_KEY)

  if (userId) sessionStorage.setItem(USER_ID_KEY, userId)
  else sessionStorage.removeItem(USER_ID_KEY)
}

function notifySessionChange(
  reason: SessionChangeReason,
  previousUserId: string | null,
  user?: User,
): void {
  const change: StoredSessionChange = {
    ...getStoredSessionSnapshot(),
    previousUserId,
    reason,
    ...(user ? { user } : {}),
  }
  sessionChangeListeners.forEach((listener) => listener(change))
}

export function isStoredSessionCurrent(snapshot: StoredSessionSnapshot): boolean {
  const current = getStoredSessionSnapshot()
  return (
    current.generation === snapshot.generation &&
    current.token === snapshot.token &&
    current.userId === snapshot.userId
  )
}

export function getStoredSessionSnapshot(): StoredSessionSnapshot {
  const token = storedToken()
  return {
    token,
    userId: storedUserId() ?? tokenSubject(token),
    generation: sessionGeneration,
  }
}

export function getStoredToken(): string | null {
  return storedToken()
}

export function getStoredUserId(): string | null {
  return storedUserId()
}

/** Starts a new identity only if no newer session superseded the operation. */
export function startStoredSessionIfCurrent(
  expected: StoredSessionSnapshot,
  token: string,
  userId: string,
  user?: User,
): boolean {
  if (!isStoredSessionCurrent(expected)) return false

  const previousUserId = expected.userId
  sessionGeneration += 1
  persistSession(token, userId)
  notifySessionChange('authenticated', previousUserId, user)
  return true
}

/** Commits a refresh only to the exact session generation that initiated it. */
export function commitRefreshedSession(
  expected: StoredSessionSnapshot,
  token: string,
  userId: string,
  user?: User,
): boolean {
  if (!isStoredSessionCurrent(expected)) return false

  if (expected.userId && expected.userId !== userId) {
    clearStoredSessionIfCurrent(expected, 'expired')
    return false
  }

  persistSession(token, userId)
  notifySessionChange('refreshed', expected.userId, user)
  return true
}

/** Binds a legacy/restored token to the identity returned by /auth/me. */
export function confirmStoredSessionIdentity(
  expected: StoredSessionSnapshot,
  userId: string,
): boolean {
  if (!isStoredSessionCurrent(expected)) return false

  if (expected.userId && expected.userId !== userId) {
    clearStoredSessionIfCurrent(expected, 'expired')
    return false
  }

  persistSession(expected.token, userId)
  notifySessionChange('restored', expected.userId)
  return true
}

export function clearStoredSessionIfCurrent(
  expected: StoredSessionSnapshot,
  reason: Extract<SessionChangeReason, 'expired' | 'logout'>,
): boolean {
  if (!isStoredSessionCurrent(expected)) return false

  const previousUserId = expected.userId
  sessionGeneration += 1
  persistSession(null, null)
  notifySessionChange(reason, previousUserId)
  return true
}

export function invalidateStoredSession(
  reason: Extract<SessionChangeReason, 'expired' | 'logout'>,
): StoredSessionSnapshot {
  const previous = getStoredSessionSnapshot()
  sessionGeneration += 1
  persistSession(null, null)
  notifySessionChange(reason, previous.userId)
  return previous
}

/** Compatibility helper for callers that do not yet know the user id. */
export function setStoredToken(token: string): void {
  const previousUserId = storedUserId()
  sessionGeneration += 1
  persistSession(token, previousUserId)
  notifySessionChange('authenticated', previousUserId)
}

/** Compatibility helper. Session-sensitive code should prefer compare-and-set. */
export function clearStoredToken(): void {
  invalidateStoredSession('expired')
}

export function subscribeToStoredSession(listener: SessionChangeListener): () => void {
  sessionChangeListeners.add(listener)
  return () => sessionChangeListeners.delete(listener)
}

export function subscribeToStoredToken(listener: TokenChangeListener): () => void {
  return subscribeToStoredSession(({ token }) => listener(token))
}
