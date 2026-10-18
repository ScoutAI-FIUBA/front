interface LoginOrigin {
  pathname?: unknown
  search?: unknown
  hash?: unknown
}

export type LoginNavigationReason = 'auth-required' | 'session-expired'

export interface LoginLocationState {
  from?: LoginOrigin
  reason?: LoginNavigationReason
  ownerUserId?: string
}

export function createLoginNavigationState(
  from: LoginOrigin,
  ownerUserId: string | null,
): LoginLocationState {
  return {
    from: {
      pathname: from.pathname,
      search: from.search,
      hash: from.hash,
    },
    reason: ownerUserId ? 'session-expired' : 'auth-required',
    ...(ownerUserId ? { ownerUserId } : {}),
  }
}

export function loginDestination(state: unknown, authenticatedUserId: string): string {
  const loginState = state as LoginLocationState | null
  const from = loginState?.from
  if (!from || typeof from.pathname !== 'string') return '/'
  if (loginState?.reason === 'session-expired') {
    if (!loginState.ownerUserId || loginState.ownerUserId !== authenticatedUserId) return '/'
  } else if (loginState?.reason !== 'auth-required') {
    return '/'
  }
  if (!from.pathname.startsWith('/') || from.pathname.startsWith('//') || from.pathname === '/login') {
    return '/'
  }

  const search = typeof from.search === 'string' && from.search.startsWith('?') ? from.search : ''
  const hash = typeof from.hash === 'string' && from.hash.startsWith('#') ? from.hash : ''
  return `${from.pathname}${search}${hash}`
}
