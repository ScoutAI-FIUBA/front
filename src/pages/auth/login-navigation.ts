interface LoginOrigin {
  pathname?: unknown
  search?: unknown
  hash?: unknown
}

interface LoginLocationState {
  from?: LoginOrigin
}

export function loginDestination(state: unknown): string {
  const from = (state as LoginLocationState | null)?.from
  if (!from || typeof from.pathname !== 'string') return '/'
  if (!from.pathname.startsWith('/') || from.pathname.startsWith('//') || from.pathname === '/login') {
    return '/'
  }

  const search = typeof from.search === 'string' && from.search.startsWith('?') ? from.search : ''
  const hash = typeof from.hash === 'string' && from.hash.startsWith('#') ? from.hash : ''
  return `${from.pathname}${search}${hash}`
}
