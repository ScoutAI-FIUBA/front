const TOKEN_KEY = 'scoutai-auth-token'

type TokenChangeListener = (token: string | null) => void

const tokenChangeListeners = new Set<TokenChangeListener>()

function notifyTokenChange(token: string | null): void {
  tokenChangeListeners.forEach((listener) => listener(token))
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
  notifyTokenChange(token)
}

export function clearStoredToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  notifyTokenChange(null)
}

export function subscribeToStoredToken(listener: TokenChangeListener): () => void {
  tokenChangeListeners.add(listener)
  return () => tokenChangeListeners.delete(listener)
}
