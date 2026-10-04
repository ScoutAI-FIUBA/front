import { useCallback, useEffect, useState } from 'react'
import { isApiAuthenticationError } from '@/services/api/errors'
import {
  hasActiveCatalogJobs,
  type AnalysisJobCatalog,
} from './analysis-job-catalog'
import {
  loadAnalysisJobCatalog,
  peekAnalysisJobCatalog,
  refreshCachedActiveAnalysisJobs,
} from './analysis-job-catalog-store'

export type AnalysisCatalogLoadState = 'loading' | 'success' | 'error' | 'session-expired'

export function useAnalysisJobCatalog(pollIntervalMs = 10_000) {
  const initialCatalog = peekAnalysisJobCatalog()
  const [catalog, setCatalog] = useState<AnalysisJobCatalog | null>(initialCatalog)
  const [loadState, setLoadState] = useState<AnalysisCatalogLoadState>(
    initialCatalog ? 'success' : 'loading',
  )
  const [isRefreshing, setIsRefreshing] = useState(false)

  const load = useCallback(async (force = false) => {
    if (catalog) setIsRefreshing(true)
    else setLoadState('loading')

    try {
      const next = await loadAnalysisJobCatalog({ force })
      setCatalog(next)
      setLoadState('success')
    } catch (error) {
      if (isApiAuthenticationError(error)) {
        setLoadState('session-expired')
      } else if (!catalog) {
        setLoadState('error')
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [catalog])

  useEffect(() => {
    if (!catalog) void load(false)
  }, [catalog, load])

  useEffect(() => {
    if (!catalog || !hasActiveCatalogJobs(catalog) || loadState !== 'success') return
    let cancelled = false
    const timer = globalThis.setTimeout(() => {
      void refreshCachedActiveAnalysisJobs(catalog).then(
        (next) => {
          if (!cancelled) setCatalog(next)
        },
        (error: unknown) => {
          if (!cancelled && isApiAuthenticationError(error)) setLoadState('session-expired')
        },
      )
    }, pollIntervalMs)

    return () => {
      cancelled = true
      globalThis.clearTimeout(timer)
    }
  }, [catalog, loadState, pollIntervalMs])

  return {
    catalog,
    loadState,
    isRefreshing,
    refresh: () => load(true),
  }
}
