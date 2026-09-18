import { ApiResponseError, parseApiError } from './errors.ts'
import { clearStoredToken, getStoredToken, setStoredToken } from './token.ts'

export const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ??
  import.meta.env?.VITE_API_URL ??
  'http://localhost:8005'

export const DEFAULT_REQUEST_TIMEOUT_MS = 20_000

function fetchWithTimeout(
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs)

  if (init?.signal) {
    if (init.signal.aborted) {
      globalThis.clearTimeout(timeoutId)
      controller.abort()
    } else {
      init.signal.addEventListener('abort', () => controller.abort(), { once: true })
    }
  }

  return fetch(url, { ...init, signal: controller.signal }).finally(() => {
    globalThis.clearTimeout(timeoutId)
  })
}

export interface ApiFetchOptions {
  auth?: boolean
  skipRefresh?: boolean
  timeoutMs?: number
  timeoutMessage?: string
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
        const res = await fetchWithTimeout(
          `${API_BASE_URL}/auth/refresh`,
          {
            method: 'POST',
            credentials: 'include',
          },
          DEFAULT_REQUEST_TIMEOUT_MS,
        )
        if (!res.ok) {
          clearStoredToken()
          return null
        }
        const data = (await res.json()) as LoginResponse
        setStoredToken(data.access_token)
        return data.access_token
      } catch {
        clearStoredToken()
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
  const {
    auth = true,
    skipRefresh = false,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    timeoutMessage,
  } = options
  const token = auth ? getStoredToken() : null

  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let res: Response
  try {
    res = await fetchWithTimeout(
      `${API_BASE_URL}${path}`,
      {
        ...init,
        headers,
        credentials: 'include',
      },
      timeoutMs,
    )
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(timeoutMessage ?? 'El servidor no respondió a tiempo. Intentá nuevamente.')
    }
    throw new Error(
      `No se pudo conectar con el backend (${API_BASE_URL}). Verificá tu conexión o la URL de la API.`,
    )
  }

  if (res.status === 401 && auth && skipRefresh) {
    clearStoredToken()
  } else if (res.status === 401 && auth && token) {
    const newToken = await tryRefreshToken()
    if (newToken) {
      return apiFetch(path, init, { ...options, skipRefresh: true })
    }
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
  if (!res.ok) throw new ApiResponseError(await parseApiError(res), res.status)
  return res.json() as Promise<T>
}
