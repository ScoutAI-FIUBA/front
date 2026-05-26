import { parseApiError } from './errors'
import { clearStoredToken, getStoredToken, setStoredToken } from './token'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:8005'

interface ApiFetchOptions {
  auth?: boolean
  skipRefresh?: boolean
}

interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: {
    id: string
    email: string
    role: string
    email_verified: boolean
  }
}

let refreshPromise: Promise<string | null> | null = null

async function tryRefreshToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })
        if (!res.ok) return null
        const data = (await res.json()) as LoginResponse
        setStoredToken(data.access_token)
        return data.access_token
      } catch {
        return null
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const { auth = true, skipRefresh = false } = options
  const token = auth ? getStoredToken() : null

  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (res.status === 401 && auth && !skipRefresh) {
    const newToken = await tryRefreshToken()
    if (newToken) {
      return apiFetch(path, init, { ...options, skipRefresh: true })
    }
    clearStoredToken()
  }

  return res
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit,
  options?: ApiFetchOptions,
): Promise<T> {
  const res = await apiFetch(path, init, options)
  if (res.status === 204) return undefined as T
  if (!res.ok) throw new Error(await parseApiError(res))
  return res.json() as Promise<T>
}
