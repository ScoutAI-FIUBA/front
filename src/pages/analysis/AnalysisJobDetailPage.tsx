import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CircleAlert,
  LoaderCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusIndicator } from '@/components/ui/status-indicator'
import type { AppShellOutletContext } from '@/components/layout/AppShell'
import {
  analysisJobService,
  getVideoByIdForTeam,
  teamService,
  videoService,
} from '@/services/registry'
import {
  classifyAnalysisJobDetailError,
  loadAnalysisJobDetail,
  type AnalysisJobDetailModel,
} from './analysis-job-detail'
import { createAnalysisJobDetailPoller } from './analysis-job-detail-polling'
import { getAnalysisJobPresentation } from '@/pages/videos/analysis-job-presentation'
import { AnalysisPollingNotice } from '@/components/analysis/AnalysisPollingNotice'
import { isApiAuthenticationError } from '@/services/api/errors'
import {
  AnalysisJobResultsWorkspace,
  type AnalysisJobResultsSection,
} from './AnalysisJobResultsWorkspace'
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

function formatDuration(durationMs: number | undefined): string | null {
  if (!durationMs || durationMs <= 0) return null
  const minutes = Math.round(durationMs / 60_000)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return `${hours} h${remainder ? ` ${remainder} min` : ''}`
}

export function AnalysisJobDetailPage() {
  const { setWorkspaceMode } = useOutletContext<AppShellOutletContext>()
  const { jobId } = useParams<{ jobId: string }>()
  const [searchParams] = useSearchParams()
  const teamId = searchParams.get('team_id')?.trim() ?? ''
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [detail, setDetail] = useState<AnalysisJobDetailModel | null>(null)
  const [activeModule, setActiveModule] = useState<AnalysisJobResultsSection>('overview')
  const [isPollingDisconnected, setIsPollingDisconnected] = useState(false)
  const previousStatusRef = useRef<ProcessingJob['status'] | null>(null)

  useEffect(() => {
    setWorkspaceMode(true)
    return () => setWorkspaceMode(false)
  }, [setWorkspaceMode])

  useEffect(() => {
    setActiveModule('overview')
    previousStatusRef.current = null
    setIsPollingDisconnected(false)
  }, [jobId])

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
        getVideoByIdForTeam,
      })
      setDetail(data)
      previousStatusRef.current = data.job.status
      setLoadState('success')
    } catch (error) {
      setLoadState(classifyAnalysisJobDetailError(error))
    }
  }, [jobId, teamId])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  const jobStatus = detail?.job.status

  useEffect(() => {
    if (
      loadState !== 'success'
      || (jobStatus !== 'QUEUED' && jobStatus !== 'RUNNING')
      || !jobId
      || !teamId
    ) return

    const poller = createAnalysisJobDetailPoller({
      load: () => analysisJobService.get(jobId, teamId),
      onJob: (updatedJob) => {
        setIsPollingDisconnected(false)
        const previousStatus = previousStatusRef.current
        previousStatusRef.current = updatedJob.status
        setDetail((current) => current && current.job.id === updatedJob.id
          ? { ...current, job: updatedJob }
          : current)
        if (previousStatus !== 'DONE' && updatedJob.status === 'DONE') {
          toast.success('El análisis está listo para revisar')
        }
      },
      onError: (error) => {
        if (!isApiAuthenticationError(error)) setIsPollingDisconnected(true)
      },
    })
    poller.start(jobStatus)
    return () => poller.stop()
  }, [jobId, jobStatus, loadState, teamId])

  const handleJobUpdated = useCallback((updatedJob: ProcessingJob) => {
    previousStatusRef.current = updatedJob.status
    setDetail((current) => current && current.job.id === updatedJob.id
      ? { ...current, job: updatedJob }
      : current)
  }, [])

  if (loadState === 'loading') {
    return (
      <div className="mx-auto w-full max-w-[1520px] space-y-5">
        <Link to="/videos" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a Videos
        </Link>
        <section className="flex min-h-[50vh] items-center justify-center gap-3 rounded-xl bg-surface text-sm text-muted-foreground" aria-live="polite" aria-busy="true">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          Preparando el espacio de análisis…
        </section>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="mx-auto w-full max-w-[1520px] space-y-5">
        <Link to="/videos" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a Videos
        </Link>
        <Alert className="flex max-w-2xl flex-col gap-4 border-destructive/25 bg-destructive/5 p-5 sm:flex-row sm:items-center">
          <CircleAlert className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">No pudimos cargar este análisis</p>
            <p className="mt-1 text-muted-foreground">Revisá la conexión y volvé a intentarlo sin salir de esta página.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadDetail()}>Reintentar</Button>
        </Alert>
      </div>
    )
  }

  if (loadState === 'not-found' || !detail) {
    return (
      <div className="mx-auto w-full max-w-[1520px] space-y-5">
        <Link to="/videos" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a Videos
        </Link>
        <EmptyState
          icon={<CircleAlert className="h-5 w-5" aria-hidden="true" />}
          title="No encontramos este análisis"
          description="El análisis no existe, no está disponible para este equipo o el enlace está incompleto."
          action={<Button asChild variant="outline"><Link to="/videos">Volver a Videos</Link></Button>}
        />
      </div>
    )
  }

  const { job, video, team } = detail
  const presentation = getAnalysisJobPresentation(job)
  const title = video?.title || 'Análisis de video'
  const teamLabel = team?.name || `Equipo ${job.teamId}`
  const duration = formatDuration(video?.durationMs)

  return (
    <div className="mx-auto w-full max-w-[1520px] space-y-5">
      <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link to={`/videos?team_id=${encodeURIComponent(job.teamId)}`} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a Videos
          </Link>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Análisis de video</p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{teamLabel}</span>
            <span aria-hidden="true">·</span>
            <span>Solicitado {formatJobDate(job.createdAt)}</span>
            {duration && <><span aria-hidden="true">·</span><span>{duration}</span></>}
          </div>
        </div>
        <StatusIndicator state={presentation.indicatorState}>{presentation.label}</StatusIndicator>
      </header>

      {isPollingDisconnected && <AnalysisPollingNotice />}

      <AnalysisJobResultsWorkspace
        job={job}
        video={video}
        team={team}
        activeSection={activeModule}
        onSectionChange={setActiveModule}
        onJobUpdated={handleJobUpdated}
      />
    </div>
  )
}
