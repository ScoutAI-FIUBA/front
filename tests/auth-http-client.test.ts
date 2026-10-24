import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  LOGIN_REQUEST_TIMEOUT_MS,
  LOGIN_TIMEOUT_MESSAGE,
  apiAuthService,
} from '../src/services/api/auth.api.ts'
import {
  ApiNetworkError,
  ApiResponseError,
  ApiTimeoutError,
} from '../src/services/api/errors.ts'
import {
  apiFetch,
  apiJson,
  DEFAULT_REQUEST_TIMEOUT_MS,
  refreshAccessToken,
} from '../src/services/api/http-client.ts'
import {
  INVALID_CREDENTIALS_MESSAGE,
  LOGIN_NETWORK_MESSAGE,
  LOGIN_SERVER_MESSAGE,
  loginErrorMessage,
} from '../src/pages/auth/login-errors.ts'
import {
  createLoginNavigationState,
  loginDestination,
} from '../src/pages/auth/login-navigation.ts'
import {
  getStoredSessionSnapshot,
  getStoredToken,
  getStoredUserId,
  invalidateStoredSession,
  setStoredToken,
  startStoredSessionIfCurrent,
  subscribeToStoredSession,
  subscribeToStoredToken,
} from '../src/services/api/token.ts'
import {
  SESSION_RESTORE_MAX_ATTEMPTS,
  restoreSessionUser,
} from '../src/contexts/session-restore.ts'

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

function loginResponse(accessToken = 'access-new', userId = 'user-1'): Response {
  return Response.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 900,
    user: {
      id: userId,
      email: 'analyst@example.com',
      role: 'analyst',
      email_verified: true,
    },
  })
}

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
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

test('apiJson parses a JSON representation returned with 202 Accepted', async (t) => {
  t.after(restoreBrowserGlobals)
  const payload = { job: { id: 'job-accepted', status: 'QUEUED' } }
  globalThis.fetch = (async () => Response.json(payload, { status: 202 })) as typeof fetch

  const result = await apiJson<typeof payload>('/accepted-job', { method: 'POST' }, { auth: false })

  assert.deepEqual(result, payload)
})

test('apiJson keeps empty 202, 204 and 205 responses bodyless', async (t) => {
  t.after(restoreBrowserGlobals)
  const statuses = [202, 204, 205]
  let index = 0
  globalThis.fetch = (async () => {
    const status = statuses[index]
    index += 1
    return new Response(null, { status })
  }) as typeof fetch

  assert.equal(await apiJson<undefined>('/accepted-empty', undefined, { auth: false }), undefined)
  assert.equal(await apiJson<undefined>('/no-content', undefined, { auth: false }), undefined)
  assert.equal(await apiJson<undefined>('/reset-content', undefined, { auth: false }), undefined)
})

test('password reset accepts empty 204 bodies without parsing JSON', async (t) => {
  installBrowserStorage()
  t.after(restoreBrowserGlobals)
  globalThis.fetch = (async () => new Response(null, { status: 204 })) as typeof fetch

  await assert.doesNotReject(apiAuthService.resetPassword('token', 'newsecret1'))
})

test('logout uses the invalidated session token without triggering refresh', async (t) => {
  t.after(restoreBrowserGlobals)
  const requests: Array<{ authorization: string | null; method: string | undefined }> = []
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    requests.push({
      authorization: new Headers(init?.headers).get('Authorization'),
      method: init?.method,
    })
    return new Response(null, { status: 204 })
  }) as typeof fetch

  await apiAuthService.logout('access-being-logged-out')

  assert.deepEqual(requests, [{
    authorization: 'Bearer access-being-logged-out',
    method: 'POST',
  }])
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

test('protected 401 refresh retry re-sends the same FormData body without a JSON content type', async (t) => {
  installBrowserStorage()
  t.after(restoreBrowserGlobals)
  setStoredToken('access-old')
  const form = new FormData()
  form.append('home_team_id', 'h')
  const seen: Array<{ body: unknown; contentType: string | null; authorization: string | null }> = []

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/auth/refresh')) return loginResponse('access-new')
    const headers = new Headers(init?.headers)
    seen.push({
      body: init?.body,
      contentType: headers.get('Content-Type'),
      authorization: headers.get('Authorization'),
    })
    return headers.get('Authorization') === 'Bearer access-new'
      ? Response.json({ ok: true })
      : new Response(null, { status: 401 })
  }) as typeof fetch

  const response = await apiFetch('/matches/stats/import-preview', { method: 'POST', body: form })

  assert.equal(response.status, 200)
  assert.equal(seen.length, 2)
  assert.equal(seen[0].body, form)
  assert.equal(seen[1].body, form)
  assert.equal(seen[1].authorization, 'Bearer access-new')
  assert.deepEqual(seen.map((request) => request.contentType), [null, null])
  assert.equal((seen[1].body as FormData).get('home_team_id'), 'h')
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

test('session restore refreshes first when sessionStorage has no access token', async (t) => {
  installBrowserStorage()
  t.after(restoreBrowserGlobals)
  const requests: Array<{ url: string; authorization: string | null }> = []

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    const authorization = new Headers(init?.headers).get('Authorization')
    requests.push({ url, authorization })
    if (url.endsWith('/auth/refresh')) return loginResponse('access-restored')
    return Response.json({
      user: {
        id: 'user-1',
        email: 'analyst@example.com',
        role: 'analyst',
        email_verified: true,
      },
    })
  }) as typeof fetch

  const user = await apiAuthService.getCurrentUser('')

  assert.equal(user?.id, 'user-1')
  assert.equal(getStoredToken(), 'access-restored')
  assert.equal(requests.length, 2)
  assert.match(requests[0]?.url ?? '', /\/auth\/refresh$/)
  assert.equal(requests[0]?.authorization, null)
  assert.match(requests[1]?.url ?? '', /\/auth\/me$/)
  assert.equal(requests[1]?.authorization, 'Bearer access-restored')
})

test('transient auth me failures preserve the access token and remain retryable', async (t) => {
  installBrowserStorage()
  t.after(restoreBrowserGlobals)
  setStoredToken('access-existing')
  globalThis.fetch = (async () => new Response('Unavailable', { status: 503 })) as typeof fetch

  await assert.rejects(
    apiAuthService.getCurrentUser('access-existing'),
    (error: unknown) => error instanceof ApiResponseError && error.status === 503,
  )
  assert.equal(getStoredToken(), 'access-existing')
})

test('session restore retries one transient network failure automatically', async () => {
  let attempts = 0

  const user = await restoreSessionUser(async () => {
    attempts += 1
    if (attempts === 1) throw new ApiTimeoutError('temporary timeout')
    return {
      id: 'user-1',
      email: 'analyst@example.com',
      role: 'analyst',
      emailVerified: true,
    }
  })

  assert.equal(SESSION_RESTORE_MAX_ATTEMPTS, 2)
  assert.equal(attempts, 2)
  assert.equal(user?.id, 'user-1')
})

test('session restore does not retry HTTP response errors', async () => {
  let attempts = 0

  await assert.rejects(
    restoreSessionUser(async () => {
      attempts += 1
      throw new ApiResponseError('Unavailable', 503)
    }),
    (error: unknown) => error instanceof ApiResponseError && error.status === 503,
  )

  assert.equal(attempts, 1)
})

test('session restore stops after one automatic retry', async () => {
  let attempts = 0

  await assert.rejects(
    restoreSessionUser(async () => {
      attempts += 1
      throw new ApiNetworkError('temporary network failure')
    }),
    (error: unknown) => error instanceof ApiNetworkError,
  )

  assert.equal(attempts, SESSION_RESTORE_MAX_ATTEMPTS)
})

test('transient refresh failures preserve the expired token instead of forcing logout', async (t) => {
  installBrowserStorage()
  t.after(restoreBrowserGlobals)
  setStoredToken('access-expired')

  globalThis.fetch = (async (input: string | URL | Request) => (
    String(input).endsWith('/auth/refresh')
      ? new Response('Unavailable', { status: 503 })
      : new Response(null, { status: 401 })
  )) as typeof fetch

  await assert.rejects(
    apiAuthService.getCurrentUser('access-expired'),
    (error: unknown) => error instanceof ApiResponseError && error.status === 503,
  )
  assert.equal(getStoredToken(), 'access-expired')
})

test('a refresh response from user A cannot overwrite a newer user B session', async (t) => {
  installBrowserStorage()
  t.after(restoreBrowserGlobals)
  const emptySession = getStoredSessionSnapshot()
  assert.equal(startStoredSessionIfCurrent(emptySession, 'access-a', 'user-a'), true)
  const sessionA = getStoredSessionSnapshot()
  const responseA = deferred<Response>()

  globalThis.fetch = (() => responseA.promise) as typeof fetch
  const refreshA = refreshAccessToken(sessionA)

  assert.equal(startStoredSessionIfCurrent(sessionA, 'access-b', 'user-b'), true)
  responseA.resolve(loginResponse('access-a-refreshed', 'user-a'))

  assert.equal(await refreshA, null)
  assert.equal(getStoredToken(), 'access-b')
  assert.equal(getStoredUserId(), 'user-b')
})

test('legacy access tokens recover their subject before the first refresh', (t) => {
  installBrowserStorage()
  t.after(restoreBrowserGlobals)
  const payload = btoa(JSON.stringify({ sub: 'legacy-user' }))

  setStoredToken(`header.${payload}.signature`)

  assert.equal(getStoredSessionSnapshot().userId, 'legacy-user')
})

test('refreshPromise is scoped by session generation', async (t) => {
  installBrowserStorage()
  t.after(restoreBrowserGlobals)
  const emptySession = getStoredSessionSnapshot()
  assert.equal(startStoredSessionIfCurrent(emptySession, 'access-a', 'user-a'), true)
  const sessionA = getStoredSessionSnapshot()
  const responseA = deferred<Response>()
  const responseB = deferred<Response>()
  let refreshRequests = 0

  globalThis.fetch = (() => {
    refreshRequests += 1
    return refreshRequests === 1 ? responseA.promise : responseB.promise
  }) as typeof fetch

  const refreshA = refreshAccessToken(sessionA)
  assert.equal(startStoredSessionIfCurrent(sessionA, 'access-b', 'user-b'), true)
  const sessionB = getStoredSessionSnapshot()
  const refreshB = refreshAccessToken(sessionB)

  responseB.resolve(loginResponse('access-b-refreshed', 'user-b'))
  assert.deepEqual(await refreshB, { token: 'access-b-refreshed', userId: 'user-b' })
  responseA.resolve(loginResponse('access-a-refreshed', 'user-a'))
  assert.equal(await refreshA, null)

  assert.equal(refreshRequests, 2)
  assert.equal(getStoredToken(), 'access-b-refreshed')
  assert.equal(getStoredUserId(), 'user-b')
})

test('concurrent requests in one session share a single refresh', async (t) => {
  installBrowserStorage()
  t.after(restoreBrowserGlobals)
  const emptySession = getStoredSessionSnapshot()
  assert.equal(startStoredSessionIfCurrent(emptySession, 'access-a', 'user-a'), true)
  const sessionA = getStoredSessionSnapshot()
  const refreshResponse = deferred<Response>()
  let refreshRequests = 0

  globalThis.fetch = (() => {
    refreshRequests += 1
    return refreshResponse.promise
  }) as typeof fetch

  const first = refreshAccessToken(sessionA)
  const second = refreshAccessToken(sessionA)
  refreshResponse.resolve(loginResponse('access-a-refreshed', 'user-a'))

  assert.deepEqual(await first, { token: 'access-a-refreshed', userId: 'user-a' })
  assert.deepEqual(await second, { token: 'access-a-refreshed', userId: 'user-a' })
  assert.equal(refreshRequests, 1)
})

test('a refresh identity mismatch between tabs expires the local session', async (t) => {
  installBrowserStorage()
  t.after(restoreBrowserGlobals)
  const emptySession = getStoredSessionSnapshot()
  assert.equal(startStoredSessionIfCurrent(emptySession, 'access-a', 'user-a'), true)
  const sessionA = getStoredSessionSnapshot()
  let expiration: { previousUserId: string | null; reason: string } | null = null
  const unsubscribe = subscribeToStoredSession((change) => {
    if (!change.token) expiration = change
  })
  t.after(unsubscribe)
  globalThis.fetch = (async () => loginResponse('access-b', 'user-b')) as typeof fetch

  assert.equal(await refreshAccessToken(sessionA), null)
  assert.equal(getStoredToken(), null)
  assert.equal(getStoredUserId(), null)
  assert.equal(expiration?.previousUserId, 'user-a')
  assert.equal(expiration?.reason, 'expired')
})

test('logout generation prevents an older pending operation from restoring credentials', (t) => {
  installBrowserStorage()
  t.after(restoreBrowserGlobals)
  const operationSession = getStoredSessionSnapshot()

  invalidateStoredSession('logout')

  assert.equal(
    startStoredSessionIfCurrent(operationSession, 'late-access-a', 'user-a'),
    false,
  )
  assert.equal(getStoredToken(), null)
  assert.equal(getStoredUserId(), null)
})

test('a late 401 from user A cannot clear user B credentials', async (t) => {
  installBrowserStorage()
  t.after(restoreBrowserGlobals)
  const emptySession = getStoredSessionSnapshot()
  assert.equal(startStoredSessionIfCurrent(emptySession, 'access-a', 'user-a'), true)
  const sessionA = getStoredSessionSnapshot()
  const lateResponse = deferred<Response>()
  globalThis.fetch = (() => lateResponse.promise) as typeof fetch

  const requestA = apiFetch('/protected', undefined, { skipRefresh: true })
  assert.equal(startStoredSessionIfCurrent(sessionA, 'access-b', 'user-b'), true)
  lateResponse.resolve(new Response(null, { status: 401 }))

  assert.equal((await requestA).status, 401)
  assert.equal(getStoredToken(), 'access-b')
  assert.equal(getStoredUserId(), 'user-b')
})

test('login errors use product copy without exposing backend messages', () => {
  assert.equal(loginErrorMessage(new ApiResponseError('Invalid credentials', 401)), INVALID_CREDENTIALS_MESSAGE)
  assert.equal(loginErrorMessage(new ApiTimeoutError(LOGIN_TIMEOUT_MESSAGE)), LOGIN_TIMEOUT_MESSAGE)
  assert.equal(loginErrorMessage(new ApiNetworkError('backend url')), LOGIN_NETWORK_MESSAGE)
  assert.equal(loginErrorMessage(new ApiResponseError('database unavailable', 503)), LOGIN_SERVER_MESSAGE)
  assert.doesNotMatch(loginErrorMessage(new ApiResponseError('Invalid credentials', 401)), /Invalid credentials/)
})

test('login destination preserves a legitimate first-session deep link', () => {
  const state = createLoginNavigationState(
    { pathname: '/analisis/jobs/job-1', search: '?team_id=team-1', hash: '#shots' },
    null,
  )

  assert.equal(state.reason, 'auth-required')
  assert.equal(loginDestination(state, 'user-new'), '/analisis/jobs/job-1?team_id=team-1#shots')
})

test('expired-session destinations are restored only for the same identity', () => {
  const state = createLoginNavigationState(
    { pathname: '/partidos/match-from-a', search: '', hash: '' },
    'user-a',
  )

  assert.equal(state.reason, 'session-expired')
  assert.equal(loginDestination(state, 'user-a'), '/partidos/match-from-a')
  assert.equal(loginDestination(state, 'user-b'), '/')
})

test('login destination rejects legacy, login and external targets', () => {
  assert.equal(loginDestination({ from: { pathname: '/dashboard' } }, 'user-1'), '/')
  assert.equal(loginDestination({ reason: 'auth-required', from: { pathname: '/login' } }, 'user-1'), '/')
  assert.equal(loginDestination({ reason: 'auth-required', from: { pathname: '//external.example/path' } }, 'user-1'), '/')
  assert.equal(loginDestination(undefined, 'user-1'), '/')
})

test('password and Google login resolve pending navigation with the returned identity', () => {
  const source = readFileSync(
    new URL('../src/pages/auth/LoginPage.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /const authenticatedUser = await login\(/)
  assert.match(source, /const authenticatedUser = await loginWithGoogle\(/)
  assert.equal(
    source.match(/loginDestination\(location\.state, authenticatedUser\.id\)/g)?.length,
    2,
  )
})

test('AuthContext subscribes to versioned session changes and keeps private caches identity-scoped', () => {
  const source = readFileSync(
    new URL('../src/contexts/AuthContext.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /subscribeToStoredSession\(\(change\) =>/)
  assert.match(source, /setToken\(change\.token\)/)
  assert.match(source, /if \(!change\.token \|\| !change\.userId\)/)
  assert.match(source, /setAnalysisJobCatalogIdentity\(userId\)/)
  assert.match(source, /setMatchPosterCacheIdentity\(userId\)/)
  assert.match(source, /authService\.getCurrentUser\(getStoredToken\(\) \?\? ''\)/)
  assert.match(source, /startStoredSessionIfCurrent/)
  assert.match(source, /invalidateStoredSession\('logout'\)/)
  assert.match(source, /setSessionRestoreError\(true\)/)
})

test('protected auth loading explains restoration and preserves the original route', () => {
  const protectedRoute = readFileSync(
    new URL('../src/components/layout/ProtectedRoute.tsx', import.meta.url),
    'utf8',
  )
  const loading = readFileSync(
    new URL('../src/components/auth/SessionRestoreStatus.tsx', import.meta.url),
    'utf8',
  )

  assert.match(protectedRoute, /createLoginNavigationState/)
  assert.match(protectedRoute, /sessionEndReason === 'expired' \? lastAuthenticatedUserId : null/)
  assert.match(protectedRoute, /sessionEndReason === 'logout'/)
  assert.match(protectedRoute, /No pudimos verificar tu sesión/)
  assert.match(loading, /AUTH_SLOW_RESTORE_DELAY_MS = 8_000/)
  assert.match(loading, /Restaurando tu sesión/)
  assert.match(loading, /Está tardando más de lo habitual/)
  assert.doesNotMatch(loading, /cold start|despertando/i)
})
