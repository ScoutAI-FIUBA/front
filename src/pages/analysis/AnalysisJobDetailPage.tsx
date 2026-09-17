import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  Video as VideoIcon,
} from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { StatusIndicator } from '@/components/ui/status-indicator'
import { analysisJobService, teamService, videoService } from '@/services/registry'
import {
  classifyAnalysisJobDetailError,
  loadAnalysisJobDetail,
  type AnalysisJobDetailModel,
} from './analysis-job-detail'
import { getAnalysisJobPresentation } from '@/pages/videos/analysis-job-presentation'
import { AnalysisJobTeamSideSelector } from './AnalysisJobTeamSide'
import { AnalysisJobShootingStatsView } from './AnalysisJobShootingStats'
import { AnalysisJobShotChartView } from './AnalysisJobShotChart'
import type { ProcessingJob } from '@/types'

type LoadState = 'loading' | 'success' | 'error' | 'not-found'

function formatJobDate(value: string): string {
  return new Date(value).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AnalysisJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const [searchParams] = useSearchParams()
  const teamId = searchParams.get('team_id')?.trim() ?? ''
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [detail, setDetail] = useState<AnalysisJobDetailModel | null>(null)

  const loadDetail = useCallback(async () => {
    setDetail(null)

    if (!jobId || !teamId) {
      setLoadState('not-found')
      return
    }

    setLoadState('loading')
    try {
      const data = await loadAnalysisJobDetail(jobId, teamId, {
        analysisJobs: analysisJobService,
        videos: videoService,
        teams: teamService,
      })
      setDetail(data)
      setLoadState('success')
    } catch (error) {
      setLoadState(classifyAnalysisJobDetailError(error))
    }
  }, [jobId, teamId])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  const handleJobUpdated = useCallback((updatedJob: ProcessingJob) => {
    setDetail((current) => current && current.job.id === updatedJob.id
      ? { ...current, job: updatedJob }
      : current)
  }, [])

  if (loadState === 'loading') {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-6">
        <Link to="/videos" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a Videos
        </Link>
        <section
          className="flex min-h-48 items-center gap-3 border-y py-10 text-sm text-muted-foreground"
          aria-live="polite"
          aria-busy="true"
        >
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          Cargando análisis…
        </section>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-6">
        <Link to="/videos" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a Videos
        </Link>
        <Alert className="flex max-w-2xl flex-col gap-4 border-destructive/25 bg-destructive/5 p-5 sm:flex-row sm:items-center">
          <CircleAlert className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">No pudimos cargar este análisis</p>
            <p className="mt-1 text-muted-foreground">
              Revisá la conexión y volvé a intentarlo sin salir de esta ejecución.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadDetail()}>
            Reintentar
          </Button>
        </Alert>
      </div>
    )
  }

  if (loadState === 'not-found' || !detail) {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-6">
        <Link to="/videos" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a Videos
        </Link>
        <EmptyState
          icon={<CircleAlert className="h-5 w-5" aria-hidden="true" />}
          title="No encontramos este análisis"
          description="El job no existe, no está disponible para este equipo o el enlace está incompleto."
          action={(
            <Button asChild variant="outline">
              <Link to="/videos">Volver a Videos</Link>
            </Button>
          )}
        />
      </div>
    )
  }

  const { job, video, team } = detail
  const presentation = getAnalysisJobPresentation(job)
  const title = video?.title || 'Análisis de video'
  const contextLabel = team?.name || `Equipo ${job.teamId}`

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-8">
      <Link to="/videos" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a Videos
      </Link>

      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Analysis Job</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{contextLabel}</p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">Job {job.id}</p>
        </div>
        <StatusIndicator state={presentation.indicatorState}>{presentation.label}</StatusIndicator>
      </header>

      {job.status === 'QUEUED' && (
        <Alert className="border-border bg-surface p-5">
          <p className="font-semibold text-foreground">El análisis está en cola</p>
          <p className="mt-1 text-muted-foreground">{presentation.message}</p>
        </Alert>
      )}

      {job.status === 'RUNNING' && (
        <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-labelledby="job-progress-title">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="job-progress-title" className="font-semibold text-foreground">Análisis en proceso</h2>
              <p className="mt-1 text-sm text-muted-foreground">El backend continúa procesando este video.</p>
            </div>
            {job.progressPercent != null && (
              <span className="text-sm font-semibold text-primary">{job.progressPercent}% procesado</span>
            )}
          </div>
          {job.progressPercent != null ? (
            <Progress
              value={job.progressPercent}
              className="mt-4"
              aria-label={`Progreso del análisis: ${job.progressPercent}%`}
            />
          ) : (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <LoaderCircle className="h-4 w-4 animate-spin text-information" aria-hidden="true" />
              {presentation.message}
            </div>
          )}
        </section>
      )}

      {job.status === 'FAILED' && (
        <Alert className="flex items-start gap-3 border-destructive/25 bg-destructive/5 p-5">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">El análisis falló</p>
            <p className="mt-1 text-destructive">{presentation.message}</p>
          </div>
        </Alert>
      )}

      {job.status === 'DONE' && (
        <>
          <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-labelledby="job-completed-title">
            <div className="flex items-start gap-3">
              <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
              <div>
                <h2 id="job-completed-title" className="font-semibold text-foreground">Análisis completado</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  El procesamiento terminó correctamente.
                </p>
              </div>
            </div>
          </section>

          <AnalysisJobTeamSideSelector job={job} onJobUpdated={handleJobUpdated} />
          <AnalysisJobShootingStatsView
            key={`stats-${job.ourTeamSide ?? 'unconfirmed'}`}
            job={job}
          />
          <AnalysisJobShotChartView
            key={`shot-chart-${job.ourTeamSide ?? 'unconfirmed'}`}
            job={job}
          />
        </>
      )}

      <section className="space-y-3" aria-label="Información secundaria del análisis">
        <details className="group rounded-lg border bg-surface" open>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30">
            <span className="flex items-center gap-2">
              <VideoIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Información de la ejecución
            </span>
          </summary>
          <dl className="grid gap-3 border-t px-5 py-5 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Video</dt><dd className="mt-1 text-foreground">{video?.title || job.videoId}</dd></div>
            <div><dt className="text-muted-foreground">Equipo</dt><dd className="mt-1 text-foreground">{team?.name || job.teamId}</dd></div>
            <div><dt className="text-muted-foreground">Creado</dt><dd className="mt-1 text-foreground">{formatJobDate(job.createdAt)}</dd></div>
            <div><dt className="text-muted-foreground">Actualizado</dt><dd className="mt-1 text-foreground">{formatJobDate(job.updatedAt)}</dd></div>
            {job.startedAt && <div><dt className="text-muted-foreground">Inicio</dt><dd className="mt-1 text-foreground">{formatJobDate(job.startedAt)}</dd></div>}
            {job.finishedAt && <div><dt className="text-muted-foreground">Finalización</dt><dd className="mt-1 text-foreground">{formatJobDate(job.finishedAt)}</dd></div>}
          </dl>
        </details>
      </section>
    </div>
  )
}
