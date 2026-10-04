import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, CircleAlert, LoaderCircle, Play, RefreshCw } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { StatusIndicator } from '@/components/ui/status-indicator'
import { analysisJobService } from '@/services/registry'
import type { ProcessingJob } from '@/types'
import {
  addCreatedAnalysisJob,
  createAnalysisJobSubmission,
} from './analysis-job-creation'
import {
  analysisJobDetailActionLabel,
  analysisJobDetailPath,
} from '@/pages/analysis/analysis-job-detail'
import { getAnalysisJobPresentation } from './analysis-job-presentation'
import { createAnalysisJobsPoller, hasActiveAnalysisJobs } from './analysis-jobs-polling'
import { addCreatedJobToAnalysisCatalog } from '@/pages/analysis/analysis-job-catalog-store'
import { isApiAuthenticationError } from '@/services/api/errors'

type LoadState = 'loading' | 'success' | 'error' | 'session-expired'

interface VideoAnalysisJobsProps {
  videoId: string
  teamId: string
  videoTitle: string
  videoReady: boolean
}

function formatJobDate(value: string): string {
  return new Date(value).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function VideoAnalysisJobs({
  videoId,
  teamId,
  videoTitle,
  videoReady,
}: VideoAnalysisJobsProps) {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [jobs, setJobs] = useState<ProcessingJob[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [creationError, setCreationError] = useState<string | null>(null)
  const requestInFlightRef = useRef<Promise<ProcessingJob[]> | null>(null)

  const requestJobs = useCallback((): Promise<ProcessingJob[]> => {
    if (requestInFlightRef.current) return requestInFlightRef.current

    const request = analysisJobService.listForVideo(videoId, teamId)
    const trackedRequest = request.finally(() => {
      if (requestInFlightRef.current === trackedRequest) {
        requestInFlightRef.current = null
      }
    })
    requestInFlightRef.current = trackedRequest
    return trackedRequest
  }, [teamId, videoId])

  const loadJobs = useCallback(async () => {
    setLoadState('loading')

    try {
      const data = await requestJobs()
      setJobs(data)
      setLoadState('success')
    } catch (error) {
      setJobs([])
      setLoadState(isApiAuthenticationError(error) ? 'session-expired' : 'error')
    }
  }, [requestJobs])

  const refreshJobs = useCallback(async () => {
    setIsRefreshing(true)

    try {
      const data = await requestJobs()
      setJobs(data)
      setLoadState('success')
    } catch (error) {
      if (isApiAuthenticationError(error)) setLoadState('session-expired')
      else setLoadState('error')
    } finally {
      setIsRefreshing(false)
    }
  }, [requestJobs])

  const creationSubmission = useMemo(() => createAnalysisJobSubmission({
    create: () => analysisJobService.create(videoId, { teamId }),
    onCreated: (job) => {
      setJobs((current) => addCreatedAnalysisJob(current, job))
      addCreatedJobToAnalysisCatalog(job)
      setCreationError(null)
      setLoadState('success')
    },
    onError: () => {
      setCreationError('No pudimos iniciar el análisis. Reintentá en unos segundos.')
    },
    onSubmittingChange: setIsCreating,
  }), [teamId, videoId])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  useEffect(() => {
    if (loadState !== 'success' || isCreating) return

    const poller = createAnalysisJobsPoller({
      load: requestJobs,
      onJobs: setJobs,
    })
    poller.start(jobs)
    return () => poller.stop()
  }, [isCreating, jobs, loadState, requestJobs])

  const activeJobExists = hasActiveAnalysisJobs(jobs)
  const runningJob = jobs.find((job) => job.status === 'RUNNING')

  return (
    <section className="bg-surface-subtle px-4 py-5 sm:px-6" aria-label={`Historial de análisis de ${videoTitle}`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Historial de análisis del video</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Análisis registrados únicamente para este video.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {videoReady && loadState === 'success' && (
            runningJob ? (
              <Button asChild size="sm">
                <Link to={analysisJobDetailPath(runningJob)}>
                  Ver progreso
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={isCreating || isRefreshing || activeJobExists}
                onClick={() => void creationSubmission.submit()}
              >
                {isCreating ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Play className="h-4 w-4" aria-hidden="true" />
                )}
                {isCreating
                  ? 'Iniciando…'
                  : activeJobExists
                    ? 'Análisis en curso'
                    : 'Iniciar análisis'}
              </Button>
            )
          )}
          {loadState === 'success' && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isRefreshing || isCreating}
              onClick={() => void refreshJobs()}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              {isRefreshing ? 'Actualizando…' : 'Actualizar'}
            </Button>
          )}
        </div>
      </div>

      {creationError && (
        <Alert className="mb-4 flex items-start gap-3 border-destructive/25 bg-destructive/5 p-4">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">No pudimos iniciar el análisis</p>
            <p className="mt-1 text-destructive">{creationError}</p>
          </div>
        </Alert>
      )}

      {loadState === 'loading' && (
        <div
          className="flex min-h-28 items-center gap-3 border-y py-6 text-sm text-muted-foreground"
          aria-live="polite"
          aria-busy="true"
        >
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          Cargando historial de este video…
        </div>
      )}

      {loadState === 'error' && (
        <Alert className="flex max-w-2xl flex-col gap-4 border-destructive/25 bg-destructive/5 p-5 sm:flex-row sm:items-center">
          <CircleAlert className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">No pudimos cargar el historial</p>
            <p className="mt-1 text-muted-foreground">
              Revisá la conexión y volvé a intentarlo para consultar los análisis de este video.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadJobs()}>
            Reintentar
          </Button>
        </Alert>
      )}

      {loadState === 'session-expired' && (
        <div className="flex min-h-28 items-center gap-3 border-y py-6 text-sm text-muted-foreground" role="status">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          Tu sesión terminó. Redirigiendo al ingreso…
        </div>
      )}

      {loadState === 'success' && jobs.length === 0 && (
        <EmptyState
          className="py-5 sm:py-8"
          icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
          title="Este video todavía no tiene análisis"
          description="Cuando exista una ejecución para este video, su estado aparecerá en este historial."
        />
      )}

      {loadState === 'success' && jobs.length > 0 && (
        <div className="divide-y border-y">
          {jobs.map((job) => {
            const presentation = getAnalysisJobPresentation(job)
            const hasProgress = job.status === 'RUNNING' && job.progressPercent != null
            const detailActionLabel = analysisJobDetailActionLabel(job)

            return (
              <article key={job.id} className="px-1 py-5 sm:px-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground">{videoTitle}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Solicitada {formatJobDate(job.createdAt)}
                    </p>
                  </div>
                  <StatusIndicator state={presentation.indicatorState}>
                    {presentation.label}
                  </StatusIndicator>
                </div>

                {hasProgress && (
                  <div className="mt-4 max-w-2xl">
                    <Progress
                      value={job.progressPercent ?? undefined}
                      aria-label={`Progreso del análisis: ${job.progressPercent}%`}
                    />
                    <p className="mt-2 text-sm text-muted-foreground">{presentation.message}</p>
                  </div>
                )}

                {job.status === 'RUNNING' && !hasProgress && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground" role="status">
                    <LoaderCircle className="h-4 w-4 animate-spin text-information" aria-hidden="true" />
                    {presentation.message}
                  </div>
                )}

                {job.status !== 'RUNNING' && (
                  <p className={`mt-3 text-sm ${job.status === 'FAILED' ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {presentation.message}
                  </p>
                )}

                {detailActionLabel && (
                  <Button asChild variant="outline" size="sm" className="mt-4">
                    <Link to={analysisJobDetailPath(job)}>
                      {detailActionLabel}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
