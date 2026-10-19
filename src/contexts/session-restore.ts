import type { User } from '../types/index.ts'
import { ApiNetworkError, ApiTimeoutError } from '../services/api/errors.ts'

export const SESSION_RESTORE_MAX_ATTEMPTS = 2

export function isTransientSessionRestoreError(error: unknown): boolean {
  return error instanceof ApiNetworkError || error instanceof ApiTimeoutError
}

export async function restoreSessionUser(
  loadCurrentUser: () => Promise<User | null>,
): Promise<User | null> {
  for (let attempt = 1; attempt <= SESSION_RESTORE_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await loadCurrentUser()
    } catch (error) {
      const shouldRetry =
        attempt < SESSION_RESTORE_MAX_ATTEMPTS && isTransientSessionRestoreError(error)
      if (!shouldRetry) throw error
    }
  }

  return null
}
