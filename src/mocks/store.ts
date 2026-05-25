import type { MockStore } from '@/types'
import { SEED_DATA } from './seed'

const STORAGE_KEY = 'scoutai-mock-store'

function loadStore(): MockStore {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as MockStore
    }
  } catch {
    /* ignore */
  }
  return structuredClone(SEED_DATA)
}

let store: MockStore = loadStore()

export function getStore(): MockStore {
  return store
}

export function persistStore(): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function resetStore(): void {
  store = structuredClone(SEED_DATA)
  persistStore()
}

export function updateStore(mutator: (draft: MockStore) => void): MockStore {
  mutator(store)
  persistStore()
  return store
}

export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}
