import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { isApiAuthenticationError } from '@/services/api/errors'
import {
  hasActiveCatalogJobs,
  type AnalysisJobCatalog,
} from './analysis-job-catalog'
import {
  loadAnalysisJobCatalog,
  isAnalysisCatalogIdentityChangedError,
  peekAnalysisJobCatalog,
  refreshCachedActiveAnalysisJobs,
} from './analysis-job-catalog-store'

export type AnalysisCatalogLoadState = 'loading' | 'success' | 'error' | 'session-expired'

interface OwnedCatalogState {
  userId: string | null
  catalog: AnalysisJobCatalog | null
  loadState: AnalysisCatalogLoadState
  isRefreshing: boolean
  isPollingDisconnected: boolean
}

export function useAnalysisJobCatalog(pollIntervalMs = 10_000) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const operationId = useRef(0)
  const [state, setState] = useState<OwnedCatalogState>(() => {
    const initialCatalog = userId ? peekAnalysisJobCatalog(userId) : null
    return {
      userId,
      catalog: initialCatalog,
      loadState: initialCatalog ? 'success' : 'loading',
      isRefreshing: false,
      isPollingDisconnected: false,
    }
  })

  const visibleState: OwnedCatalogState = state.userId === userId
    ? state
    : {
        userId,
        catalog: null,
        loadState: 'loading',
        isRefreshing: false,
        isPollingDisconnected: false,
      }
  const visibleCatalog = visibleState.catalog
  const visibleLoadState = visibleState.loadState

  const load = useCallback(async (force = false) => {
    if (!userId) return
    const currentOperation = ++operationId.current
    setState((current) => {
      const catalog = current.userId === userId ? current.catalog : null
      return {
        userId,
        catalog,
        loadState: catalog ? current.loadState : 'loading',
        isRefreshing: Boolean(catalog),
        isPollingDisconnected: current.userId === userId
          ? current.isPollingDisconnected
          : false,
      }
    })

    try {
      const next = await loadAnalysisJobCatalog(userId, { force })
      if (operationId.current !== currentOperation) return
      setState({
        userId,
        catalog: next,
        loadState: 'success',
        isRefreshing: false,
        isPollingDisconnected: false,
      })
    } catch (error) {
      if (
        operationId.current !== currentOperation
        || isAnalysisCatalogIdentityChangedError(error)
      ) return
      setState((current) => {
        if (current.userId !== userId) return current
        return {
          ...current,
          loadState: isApiAuthenticationError(error)
            ? 'session-expired'
            : current.catalog ? current.loadState : 'error',
          isRefreshing: false,
        }
      })
    }
  }, [userId])

  useEffect(() => {
    operationId.current += 1
    const initialCatalog = userId ? peekAnalysisJobCatalog(userId) : null
    setState({
      userId,
      catalog: initialCatalog,
      loadState: initialCatalog ? 'success' : 'loading',
      isRefreshing: false,
      isPollingDisconnected: false,
    })
    if (userId && !initialCatalog) void load(false)
    return () => {
      operationId.current += 1
    }
  }, [load, userId])

  useEffect(() => {
    if (
      !userId
      || !visibleCatalog
      || !hasActiveCatalogJobs(visibleCatalog)
      || visibleLoadState !== 'success'
    ) return
    let cancelled = false
    const timer = globalThis.setTimeout(() => {
      const currentOperation = ++operationId.current
      void refreshCachedActiveAnalysisJobs(userId, visibleCatalog).then(
        (next) => {
          if (cancelled || operationId.current !== currentOperation) return
          setState({
            userId,
            catalog: next,
            loadState: 'success',
            isRefreshing: false,
            isPollingDisconnected: next.partialFailures.some(
              (failure) => failure.scope === 'active-job',
            ),
          })
        },
        (error: unknown) => {
          if (
            cancelled
            || operationId.current !== currentOperation
            || isAnalysisCatalogIdentityChangedError(error)
          ) return
          if (isApiAuthenticationError(error)) {
            setState((current) => current.userId === userId
              ? { ...current, loadState: 'session-expired' }
              : current)
          }
        },
      )
    }, pollIntervalMs)

    return () => {
      cancelled = true
      globalThis.clearTimeout(timer)
    }
  }, [pollIntervalMs, userId, visibleCatalog, visibleLoadState])

  return {
    catalog: visibleState.catalog,
    loadState: visibleState.loadState,
    isRefreshing: visibleState.isRefreshing,
    isPollingDisconnected: visibleState.isPollingDisconnected,
    refresh: () => load(true),
  }
}
