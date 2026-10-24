import {
  ApiNetworkError,
  ApiResponseError,
  ApiTimeoutError,
  parseApiError,
} from './errors.ts'
import {
  clearStoredSessionIfCurrent,
  commitRefreshedSession,
  getStoredSessionSnapshot,
  isStoredSessionCurrent,
  type StoredSessionSnapshot,
} from './token.ts'
import { mapApiUser, type ApiUser } from './mappers.ts'

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
  user: ApiUser
}

export interface RefreshedSession {
  token: string
  userId: string
}

interface RefreshInFlight {
  generation: number
  promise: Promise<RefreshedSession | null>
}

let refreshInFlight: RefreshInFlight | null = null

export async function refreshAccessToken(
  expectedSession: StoredSessionSnapshot = getStoredSessionSnapshot(),
): Promise<RefreshedSession | null> {
  if (!isStoredSessionCurrent(expectedSession)) return null

  if (!refreshInFlight || refreshInFlight.generation !== expectedSession.generation) {
    const inFlight: RefreshInFlight = {
      generation: expectedSession.generation,
      promise: Promise.resolve(null),
    }
    inFlight.promise = (async () => {
      let res: Response
      try {
        res = await fetchWithTimeout(
          `${API_BASE_URL}/auth/refresh`,
          {
            method: 'POST',
            credentials: 'include',
          },
          DEFAULT_REQUEST_TIMEOUT_MS,
        )
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new ApiTimeoutError('El servidor no respondió a tiempo. Intentá nuevamente.')
        }
        throw new ApiNetworkError('No pudimos conectarnos con el servidor.')
      }

      if (res.status === 401 || res.status === 403) {
        clearStoredSessionIfCurrent(expectedSession, 'expired')
        return null
      }
      if (!res.ok) {
        throw new ApiResponseError(await parseApiError(res), res.status)
      }

      const data = (await res.json()) as LoginResponse
      const user = mapApiUser(data.user)
      if (!commitRefreshedSession(expectedSession, data.access_token, user.id, user)) {
        return null
      }
      return { token: data.access_token, userId: data.user.id }
    })().finally(() => {
      if (refreshInFlight === inFlight) refreshInFlight = null
    })
    refreshInFlight = inFlight
  }
  return refreshInFlight.promise
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
  const requestSession = auth ? getStoredSessionSnapshot() : null
  const token = requestSession?.token ?? null

  const headers = new Headers(init?.headers)
  // FormData: the browser sets multipart/form-data with its boundary.
  if (!headers.has('Content-Type') && init?.body && !(init.body instanceof FormData)) {
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
      throw new ApiTimeoutError(
        timeoutMessage ?? 'El servidor no respondió a tiempo. Intentá nuevamente.',
      )
    }
    throw new ApiNetworkError('No pudimos conectarnos con el servidor.')
  }

  if (res.status === 401 && auth && skipRefresh) {
    if (requestSession) clearStoredSessionIfCurrent(requestSession, 'expired')
  } else if (res.status === 401 && auth && token && requestSession) {
    const refreshedSession = await refreshAccessToken(requestSession)
    if (refreshedSession) {
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
  if (!res.ok) throw new ApiResponseError(await parseApiError(res), res.status)
  // 204/205 are bodyless by contract. A 202 may include an accepted resource.
  if (res.status === 204 || res.status === 205) {
    return undefined as T
  }
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}
