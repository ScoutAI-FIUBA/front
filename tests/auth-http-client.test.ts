import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  LOGIN_REQUEST_TIMEOUT_MS,
  LOGIN_TIMEOUT_MESSAGE,
  apiAuthService,
} from '../src/services/api/auth.api.ts'
import { ApiResponseError } from '../src/services/api/errors.ts'
import { apiFetch, DEFAULT_REQUEST_TIMEOUT_MS } from '../src/services/api/http-client.ts'
import {
  getStoredToken,
  setStoredToken,
  subscribeToStoredToken,
} from '../src/services/api/token.ts'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

const originalFetch = globalThis.fetch
const originalSessionStorage = globalThis.sessionStorage
const originalLocalStorage = globalThis.localStorage

function installBrowserStorage(): void {
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: new MemoryStorage(),
  })
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: new MemoryStorage(),
  })
}

function restoreBrowserGlobals(): void {
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: originalFetch })
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: originalSessionStorage,
  })
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: originalLocalStorage,
  })
}

function loginResponse(accessToken = 'access-new'): Response {
  return Response.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 900,
    user: {
      id: 'user-1',
      email: 'analyst@example.com',
      role: 'analyst',
      email_verified: true,
    },
  })
}

test('login may exceed the global 20-second timeout and still finish inside 60 seconds', async (t) => {
  installBrowserStorage()
  t.after(restoreBrowserGlobals)
  t.mock.timers.enable({ apis: ['setTimeout'] })

  let requestSignal: AbortSignal | null = null
  globalThis.fetch = ((_url: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      requestSignal = init?.signal ?? null
      requestSignal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'))
      })
      setTimeout(() => resolve(loginResponse()), 25_000)
    })) as typeof fetch

  const login = apiAuthService.login({
    email: 'analyst@example.com',
    password: 'correct-password',
  })

  t.mock.timers.tick(DEFAULT_REQUEST_TIMEOUT_MS + 1)
  assert.equal(requestSignal?.aborted, false)

  t.mock.timers.tick(5_000)
  const result = await login

  assert.equal(LOGIN_REQUEST_TIMEOUT_MS, 60_000)
  assert.equal(result.token, 'access-new')
})

test('login reports its user-facing message when its 60-second timeout expires', async (t) => {
  installBrowserStorage()
  t.after(restoreBrowserGlobals)
  t.mock.timers.enable({ apis: ['setTimeout'] })

  globalThis.fetch = ((_url: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'))
      })
    })) as typeof fetch

  const login = apiAuthService.login({
    email: 'analyst@example.com',
    password: 'correct-password',
  })
  t.mock.timers.tick(LOGIN_REQUEST_TIMEOUT_MS)

  await assert.rejects(login, (error: unknown) => {
    assert.equal(error instanceof Error ? error.message : '', LOGIN_TIMEOUT_MESSAGE)
    assert.doesNotMatch(error instanceof Error ? error.message : '', /https?:\/\//)
    return true
  })
})

test('invalid login credentials preserve the backend 401 without attempting refresh', async (t) => {
  installBrowserStorage()
  t.after(restoreBrowserGlobals)
  let requests = 0
  globalThis.fetch = (async () => {
    requests += 1
    return Response.json(
      { error: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid credentials' } },
      { status: 401 },
    )
  }) as typeof fetch

  await assert.rejects(
    apiAuthService.login({ email: 'analyst@example.com', password: 'wrong' }),
    (error: unknown) => error instanceof ApiResponseError && error.status === 401,
  )

  assert.equal(requests, 1)
  assert.equal(getStoredToken(), null)
})

test('password forgot accepts empty 202 bodies without parsing JSON', async (t) => {
  installBrowserStorage()
  t.after(restoreBrowserGlobals)
  globalThis.fetch = (async () => new Response(null, { status: 202 })) as typeof fetch

  await assert.doesNotReject(apiAuthService.requestPasswordReset('analyst@example.com'))
})

test('password reset accepts empty 204 bodies without parsing JSON', async (t) => {
  installBrowserStorage()
  t.after(restoreBrowserGlobals)
  globalThis.fetch = (async () => new Response(null, { status: 204 })) as typeof fetch

  await assert.doesNotReject(apiAuthService.resetPassword('token', 'newsecret1'))
})

test('protected 401 refreshes once and retries with the new access token', async (t) => {
  installBrowserStorage()
  t.after(restoreBrowserGlobals)
  setStoredToken('access-old')
  const requests: Array<{ url: string; authorization: string | null }> = []

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    const headers = new Headers(init?.headers)
    requests.push({ url, authorization: headers.get('Authorization') })

    if (url.endsWith('/auth/refresh')) return loginResponse('access-new')
    if (headers.get('Authorization') === 'Bearer access-new') {
      return Response.json({ ok: true })
    }
    return new Response(null, { status: 401 })
  }) as typeof fetch

  const response = await apiFetch('/protected')

  assert.equal(response.status, 200)
  assert.equal(getStoredToken(), 'access-new')
  assert.equal(requests.length, 3)
  assert.deepEqual(
    requests.map((request) => request.authorization),
    ['Bearer access-old', null, 'Bearer access-new'],
  )
})

test('failed refresh clears auth immediately and later 401s do not start refresh loops', async (t) => {
  installBrowserStorage()
  t.after(restoreBrowserGlobals)
  setStoredToken('access-expired')
  let protectedRequests = 0
  let refreshRequests = 0
  let contextState = { userId: 'user-1', token: 'access-expired' as string | null }
  const unsubscribe = subscribeToStoredToken((token) => {
    contextState = {
      userId: token ? contextState.userId : '',
      token,
    }
  })
  t.after(unsubscribe)

  globalThis.fetch = (async (input: string | URL | Request) => {
    if (String(input).endsWith('/auth/refresh')) {
      refreshRequests += 1
      return Response.json(
        { error: { code: 'AUTH_TOKEN_INVALID', message: 'Refresh token is invalid' } },
        { status: 401 },
      )
    }
    protectedRequests += 1
    return new Response(null, { status: 401 })
  }) as typeof fetch

  const firstResponse = await apiFetch('/protected')

  assert.equal(firstResponse.status, 401)
  assert.equal(getStoredToken(), null)
  assert.deepEqual(contextState, { userId: '', token: null })
  assert.equal(refreshRequests, 1)

  const nextResponse = await apiFetch('/protected')

  assert.equal(nextResponse.status, 401)
  assert.equal(protectedRequests, 2)
  assert.equal(refreshRequests, 1)
})

test('AuthContext subscribes to token invalidation and clears both user and token', () => {
  const source = readFileSync(
    new URL('../src/contexts/AuthContext.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /subscribeToStoredToken\(\(nextToken\) =>/)
  assert.match(source, /setToken\(nextToken\)/)
  assert.match(source, /if \(!nextToken\) setUser\(null\)/)
})
