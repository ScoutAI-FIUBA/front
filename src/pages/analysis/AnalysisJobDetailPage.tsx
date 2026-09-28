import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  CircleAlert,
  Clock3,
  FileSearch,
  GitCompareArrows,
  LoaderCircle,
  MapPinned,
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
import { AnalysisJobCourtPositionsView, type AnalysisMovementTechnicalSummary } from './AnalysisJobCourtPositions'
import { AnalysisJobSimilarAnalysesView } from './AnalysisJobSimilarAnalyses'
import { AnalysisJobOverview } from './AnalysisJobOverview'
import { AnalysisJobDetails } from './AnalysisJobDetails'
import {
  AnalysisJobShotsWorkspace,
  type AnalysisShootingSummary,
} from './AnalysisJobShotsWorkspace'
import {
  AnalysisWorkspaceVideo,
  type AnalysisWorkspaceVideoHandle,
  type AnalysisWorkspaceVideoState,
} from './AnalysisWorkspaceVideo'
import type { ProcessingJob } from '@/types'
import { cn } from '@/lib/utils'

type LoadState = 'loading' | 'success' | 'error' | 'not-found'
type WorkspaceModule = 'overview' | 'shots' | 'movement' | 'similar' | 'details'

const MODULES: Array<{
  id: WorkspaceModule
  label: string
  icon: typeof BarChart3
  resultsOnly?: boolean
}> = [
  { id: 'overview', label: 'Resumen', icon: BarChart3 },
  { id: 'shots', label: 'Tiros', icon: Clock3, resultsOnly: true },
  { id: 'movement', label: 'Movimiento', icon: MapPinned, resultsOnly: true },
  { id: 'similar', label: 'Similares', icon: GitCompareArrows, resultsOnly: true },
  { id: 'details', label: 'Detalles', icon: FileSearch },
]

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
  const [activeModule, setActiveModule] = useState<WorkspaceModule>('overview')
  const [shootingSummary, setShootingSummary] = useState<AnalysisShootingSummary | null>(null)
  const [movementSummary, setMovementSummary] = useState<AnalysisMovementTechnicalSummary | null>(null)
  const [videoState, setVideoState] = useState<AnalysisWorkspaceVideoState>('loading')
  const playerRef = useRef<AnalysisWorkspaceVideoHandle | null>(null)
  const moduleButtonRefs = useRef<Partial<Record<WorkspaceModule, HTMLButtonElement | null>>>({})
  const previousStatusRef = useRef<ProcessingJob['status'] | null>(null)

  useEffect(() => {
    setWorkspaceMode(true)
    return () => setWorkspaceMode(false)
  }, [setWorkspaceMode])

  useEffect(() => {
    setActiveModule('overview')
    setVideoState('loading')
    setShootingSummary(null)
    setMovementSummary(null)
    previousStatusRef.current = null
  }, [jobId])

  useEffect(() => {
    const button = moduleButtonRefs.current[activeModule]
    if (!button || !globalThis.matchMedia?.('(max-width: 639px)').matches) return
    const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    button.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'center' })
  }, [activeModule])

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
        const previousStatus = previousStatusRef.current
        previousStatusRef.current = updatedJob.status
        setDetail((current) => current && current.job.id === updatedJob.id
          ? { ...current, job: updatedJob }
          : current)
        if (previousStatus !== 'DONE' && updatedJob.status === 'DONE') {
          toast.success('El análisis está listo para revisar')
        }
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

  const handleSeekToVideo = useCallback((seconds: number) => {
    if (!playerRef.current?.seekTo(seconds)) return
    if (globalThis.matchMedia?.('(max-width: 1279px)').matches) {
      const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      document.getElementById('analysis-source-video')?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      })
    }
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
  const availableModules = MODULES.filter((module) => !module.resultsOnly || job.status === 'DONE')

  return (
    <div className="mx-auto w-full max-w-[1520px] space-y-5">
      <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link to={`/videos?team_id=${encodeURIComponent(job.teamId)}`} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a Videos
          </Link>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Análisis de partido</p>
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

      <div className={cn(
        'grid items-start gap-5',
        videoState === 'error'
          ? 'xl:grid-cols-[minmax(340px,0.72fr)_minmax(620px,1.28fr)]'
          : 'xl:grid-cols-[minmax(420px,0.9fr)_minmax(560px,1.1fr)]',
      )}>
        <div className="min-w-0 xl:sticky xl:top-20">
          <AnalysisWorkspaceVideo
            ref={playerRef}
            video={video}
            videoId={job.videoId}
            teamId={job.teamId}
            title={title}
            onStateChange={setVideoState}
          />
        </div>

        <div className="min-w-0">
          <nav className="relative mb-3 overflow-hidden rounded-xl border border-white/10 bg-surface p-1.5" aria-label="Secciones del análisis">
            <div className="flex min-w-max snap-x snap-mandatory gap-1 overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {availableModules.map(({ id, label, icon: Icon }) => (
                <button
                  type="button"
                  key={id}
                  ref={(element) => { moduleButtonRefs.current[id] = element }}
                  className={cn(
                    'inline-flex h-10 snap-start items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors motion-reduce:transition-none',
                    activeModule === id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground',
                  )}
                  aria-current={activeModule === id ? 'page' : undefined}
                  onClick={() => setActiveModule(id)}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <span className="pointer-events-none absolute inset-y-1.5 right-1.5 w-6 rounded-r-lg bg-gradient-to-l from-surface to-transparent sm:hidden" aria-hidden="true" />
          </nav>

          <div className="min-h-[480px] px-1 py-2 sm:px-2 lg:px-3">
            <div hidden={activeModule !== 'overview'}>
              <AnalysisJobOverview
                job={job}
                shootingSummary={shootingSummary}
                onJobUpdated={handleJobUpdated}
                onNavigate={setActiveModule}
              />
            </div>
            <div hidden={activeModule !== 'shots'}>
              <AnalysisJobShotsWorkspace
                job={job}
                onSeekToVideo={handleSeekToVideo}
                onSummaryChange={setShootingSummary}
                onOpenOverview={() => setActiveModule('overview')}
              />
            </div>
            <div hidden={activeModule !== 'movement'}>
              <AnalysisJobCourtPositionsView job={job} onTechnicalSummaryChange={setMovementSummary} />
            </div>
            <div hidden={activeModule !== 'similar'}>
              <AnalysisJobSimilarAnalysesView job={job} teamName={team?.name} />
            </div>
            <div hidden={activeModule !== 'details'}>
              <AnalysisJobDetails
                job={job}
                video={video}
                team={team}
                shootingSummary={shootingSummary}
                movementSummary={movementSummary}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
