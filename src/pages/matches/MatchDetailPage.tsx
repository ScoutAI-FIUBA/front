import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CircleAlert,
  Clapperboard,
  FolderOpen,
  LoaderCircle,
  Play,
  RefreshCw,
} from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AnalysisPollingNotice } from '@/components/analysis/AnalysisPollingNotice'
import { BasketballCourtLines } from '@/components/analysis/BasketballCourtLines'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AnalysisWorkspaceVideo } from '@/pages/analysis/AnalysisWorkspaceVideo'
import { analysisJobDetailPath } from '@/pages/analysis/analysis-job-detail'
import { createAnalysisJobDetailPoller } from '@/pages/analysis/analysis-job-detail-polling'
import {
  analysisJobService,
  clipCollectionService,
  teamService,
  videoService,
} from '@/services/registry'
import type { ProcessingJob, Video } from '@/types'
import {
  videoMaterialState,
  type VideoAnalysisState,
} from '@/pages/videos/video-library-filters'
import {
  matchLibraryDisplayLabel,
  matchLibraryDisplayState,
  type MatchLibraryDisplayState,
} from './match-library'
import {
  clipFallbackLabel,
  loadMatchClips,
  loadMatchDetail,
  matchAnalysisPath,
  matchDetailPath,
  resolveMatchDetailTab,
  type MatchClipsModel,
  type MatchDetailModel,
  type MatchDetailTab,
} from './match-detail'

type LoadState = 'loading' | 'success' | 'error' | 'not-found'

const TABS: Array<{
  id: MatchDetailTab
  label: string
  icon: typeof Play
}> = [
  { id: 'video', label: 'Video', icon: Play },
  { id: 'reporte', label: 'Reporte', icon: BarChart3 },
  { id: 'clips', label: 'Clips', icon: Clapperboard },
]

function formatUploadDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No disponible'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function displayStateFor(model: MatchDetailModel): MatchLibraryDisplayState {
  const materialState = videoMaterialState(model.video)
  const analysisState: VideoAnalysisState = model.jobsUnavailable
    ? 'unknown'
    : model.latestJob?.status ?? 'none'
  return matchLibraryDisplayState({ materialState, analysisState })
}

function stateTone(state: MatchLibraryDisplayState): string {
  if (state === 'report-ready') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  if (state === 'analysis-error') return 'border-red-500/30 bg-red-500/10 text-red-300'
  if (state === 'queued' || state === 'analyzing') {
    return 'border-[#FF6A1F]/40 bg-[#FF6A1F]/10 text-[#FF9A68]'
  }
  if (state === 'preparing-file') return 'border-amber-500/30 bg-amber-500/10 text-amber-200'
  return 'border-white/10 bg-white/[0.04] text-[#A3ABBA]'
}

function MatchVideoTab({ video }: { video: Video }) {
  if (videoMaterialState(video) !== 'ready') {
    return (
      <section className="flex aspect-video min-h-64 flex-col items-center justify-center overflow-hidden rounded-[22px] border border-[#252B38] bg-[#11151D] px-6 text-center">
        <div className="mb-7 w-60 max-w-[70%] text-[#A3ABBA] opacity-35">
          <svg aria-hidden="true" viewBox="0 0 28 15">
            <BasketballCourtLines lengthM={28} widthM={15} />
          </svg>
        </div>
        <h2 className="scout-display text-3xl font-bold text-[#F4F5F7]">
          {video.status === 'failed' ? 'El archivo no está disponible' : 'Preparando el archivo'}
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#A3ABBA]">
          {video.status === 'failed'
            ? 'No es posible reproducir este video. El material permanece visible para conservar su historial.'
            : 'La reproducción estará disponible cuando termine la preparación del video.'}
        </p>
      </section>
    )
  }

  return (
    <AnalysisWorkspaceVideo
      video={video}
      videoId={video.id}
      teamId={video.teamId}
      title={video.title}
      minimalChrome
    />
  )
}

function ReportAction({ job }: { job: ProcessingJob }) {
  const label = job.status === 'DONE'
    ? 'Abrir reporte completo'
    : job.status === 'FAILED'
      ? 'Ver problema'
      : 'Abrir progreso'

  return (
    <Button
      asChild
      className="h-[52px] rounded-full bg-[#FF6A1F] px-7 text-base font-semibold text-white shadow-none hover:bg-[#ff7b38]"
    >
      <Link to={analysisJobDetailPath(job)}>
        {label}
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </Button>
  )
}

function MatchReportTab({
  model,
  onRetry,
}: {
  model: MatchDetailModel
  onRetry: () => void
}) {
  const { latestJob: job, video } = model

  if (model.jobsUnavailable) {
    return (
      <section className="flex flex-col items-start gap-5 border-y border-amber-500/25 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="scout-display text-3xl font-bold text-[#F4F5F7]">Estado no disponible</h2>
          <p className="mt-2 text-sm text-[#A3ABBA]">
            No pudimos verificar el historial de análisis. No vamos a asumir que este partido está sin analizar.
          </p>
        </div>
        <Button type="button" variant="outline" className="rounded-full" onClick={onRetry}>
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Reintentar
        </Button>
      </section>
    )
  }

  if (!job) {
    const ready = videoMaterialState(video) === 'ready'
    return (
      <section className="grid gap-8 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF6A1F]">
            Reporte automático
          </p>
          <h2 className="scout-display mt-3 max-w-3xl text-[clamp(2.6rem,6vw,4.2rem)] font-extrabold text-[#F4F5F7]">
            Convertí el video en evidencia para revisar
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#A3ABBA]">
            Vas a obtener: Resumen · Tiros con evidencia · Movimiento · Similares
          </p>
          <p className="mt-2 max-w-2xl text-sm text-[#A3ABBA]">
            La disponibilidad de cada resultado depende de los datos detectados en el video.
          </p>
        </div>
        <div className="lg:text-right">
          {ready ? (
            <Button
              asChild
              className="h-[54px] rounded-full bg-[#FF6A1F] px-8 text-base font-semibold text-white shadow-none hover:bg-[#ff7b38]"
            >
              <Link to={matchAnalysisPath(video)}>Analizar partido</Link>
            </Button>
          ) : (
            <p className="inline-flex min-h-[52px] items-center rounded-full border border-[#3A4254] px-6 text-sm font-medium text-[#A3ABBA]">
              Disponible cuando el archivo esté listo
            </p>
          )}
        </div>
      </section>
    )
  }

  if (job.status === 'QUEUED') {
    return (
      <section className="space-y-7 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF6A1F]">En cola</p>
          <h2 className="scout-display mt-3 text-[clamp(2.7rem,6vw,4.2rem)] font-extrabold text-[#F4F5F7]">
            El análisis está esperando para comenzar
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#A3ABBA]">
            El reporte se actualizará cuando el procesamiento empiece.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <LoaderCircle className="h-5 w-5 animate-spin text-[#FF6A1F] motion-reduce:animate-none" aria-hidden="true" />
          <ReportAction job={job} />
        </div>
      </section>
    )
  }

  if (job.status === 'RUNNING') {
    return (
      <section className="space-y-7 py-4">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF6A1F]">Analizando</p>
            <h2 className="scout-display mt-3 text-[clamp(2.7rem,6vw,4.2rem)] font-extrabold text-[#F4F5F7]">
              Estamos procesando el partido
            </h2>
          </div>
          {job.progressPercent != null ? (
            <span className="scout-display text-5xl font-extrabold text-[#FF6A1F]">
              {job.progressPercent}%
            </span>
          ) : null}
        </div>
        {job.progressPercent != null ? (
          <Progress value={job.progressPercent} aria-label={`Progreso del análisis: ${job.progressPercent}%`} />
        ) : (
          <div className="flex items-center gap-3 text-sm text-[#A3ABBA]" role="status">
            <LoaderCircle className="h-4 w-4 animate-spin text-[#FF6A1F] motion-reduce:animate-none" aria-hidden="true" />
            Procesando sin porcentaje informado.
          </div>
        )}
        <ReportAction job={job} />
      </section>
    )
  }

  if (job.status === 'FAILED') {
    return (
      <section className="space-y-7 border-y border-red-500/20 py-9">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-300">Error de análisis</p>
          <h2 className="scout-display mt-3 text-[clamp(2.7rem,6vw,4.2rem)] font-extrabold text-[#F4F5F7]">
            No pudimos completar el reporte
          </h2>
          <p className="mt-4 max-w-2xl text-base text-[#A3ABBA]">
            El video y sus clips siguen disponibles. Abrí el detalle para revisar el problema antes de intentarlo nuevamente.
          </p>
        </div>
        <ReportAction job={job} />
      </section>
    )
  }

  return (
    <section className="grid gap-8 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Reporte listo</p>
        <h2 className="scout-display mt-3 text-[clamp(2.8rem,7vw,4.8rem)] font-extrabold text-[#F4F5F7]">
          El análisis está listo para revisar
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#A3ABBA]">
          Entrá al reporte completo para revisar el resumen, los tiros con evidencia, el movimiento y los partidos similares.
        </p>
      </div>
      <ReportAction job={job} />
    </section>
  )
}

function MatchClipsTab({ videoId }: { videoId: string }) {
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [model, setModel] = useState<MatchClipsModel | null>(null)

  const load = useCallback(async () => {
    setState('loading')
    try {
      setModel(await loadMatchClips(videoId, clipCollectionService))
      setState('success')
    } catch {
      setState('error')
    }
  }, [videoId])

  useEffect(() => {
    void load()
  }, [load])

  if (state === 'loading') {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-[#A3ABBA]" aria-live="polite" aria-busy="true">
        <LoaderCircle className="h-5 w-5 animate-spin text-[#FF6A1F] motion-reduce:animate-none" aria-hidden="true" />
        Cargando clips…
      </div>
    )
  }

  if (state === 'error' || !model) {
    return (
      <section className="flex flex-col items-start gap-5 border-y border-red-500/20 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-[#F4F5F7]">No pudimos cargar los clips</h2>
          <p className="mt-2 text-sm text-[#A3ABBA]">Revisá la conexión e intentá nuevamente.</p>
        </div>
        <Button type="button" variant="outline" className="rounded-full" onClick={() => void load()}>
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Reintentar
        </Button>
      </section>
    )
  }

  const totalClips = model.collections.reduce(
    (total, collection) => total + (collection.items?.length ?? 0),
    0,
  )

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF6A1F]">Momentos guardados</p>
          <h2 className="scout-display mt-2 text-4xl font-bold text-[#F4F5F7]">Clips del partido</h2>
          <p className="mt-3 text-sm text-[#A3ABBA]">
            {totalClips === 0 ? 'Todavía no hay clips guardados.' : `${totalClips} ${totalClips === 1 ? 'clip guardado' : 'clips guardados'}.`}
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="h-[48px] rounded-full border-[#3A4254] bg-transparent px-6 text-[#F4F5F7] hover:border-[#FF6A1F] hover:bg-transparent hover:text-[#FF9A68]"
        >
          <Link to={`/videos/${encodeURIComponent(videoId)}/colecciones`}>
            <FolderOpen aria-hidden="true" className="h-4 w-4" />
            Gestionar clips
          </Link>
        </Button>
      </div>

      {model.hasPartialFailure ? (
        <div className="flex items-start gap-3 border-y border-amber-500/25 py-4 text-sm text-amber-100" role="status">
          <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          Algunas colecciones están visibles, pero sus clips no se pudieron verificar.
        </div>
      ) : null}

      {model.collections.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center border-y border-[#252B38] py-12 text-center">
          <Clapperboard aria-hidden="true" className="h-9 w-9 text-[#FF6A1F]" />
          <h3 className="scout-display mt-5 text-3xl font-bold text-[#F4F5F7]">Sin clips guardados</h3>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#A3ABBA]">
            Creá una colección y marcá un rango real del video para guardar el primer momento.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#252B38] border-y border-[#252B38]">
          {model.collections.map(({ collection, items }) => (
            <section key={collection.id} className="py-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#F4F5F7]">{collection.name}</h3>
                  {collection.description ? (
                    <p className="mt-1 text-sm text-[#A3ABBA]">{collection.description}</p>
                  ) : null}
                </div>
                <Link
                  to={`/videos/${encodeURIComponent(videoId)}/colecciones/${encodeURIComponent(collection.id)}`}
                  className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#A3ABBA] hover:text-[#FF9A68]"
                >
                  Abrir colección
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>

              {items == null ? (
                <p className="mt-5 text-sm text-amber-100">No se pudieron verificar los clips de esta colección.</p>
              ) : items.length === 0 ? (
                <p className="mt-5 text-sm text-[#A3ABBA]">Esta colección todavía está vacía.</p>
              ) : (
                <div className="mt-5 divide-y divide-[#252B38]">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      to={`/videos/${encodeURIComponent(videoId)}/colecciones/${encodeURIComponent(collection.id)}`}
                      className="group flex min-h-16 items-center justify-between gap-4 py-3"
                    >
                      <span className="scout-display text-2xl font-bold text-[#FF6A1F]">
                        {clipFallbackLabel(item)}
                      </span>
                      <Play aria-hidden="true" className="h-4 w-4 shrink-0 text-[#A3ABBA] group-hover:text-[#F4F5F7]" />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </section>
  )
}

export function MatchDetailPage() {
  const { videoId = '' } = useParams<{ videoId: string }>()
  const [searchParams] = useSearchParams()
  const activeTab = resolveMatchDetailTab(searchParams)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [model, setModel] = useState<MatchDetailModel | null>(null)
  const [isPollingDisconnected, setIsPollingDisconnected] = useState(false)

  const load = useCallback(async () => {
    if (!videoId) {
      setLoadState('not-found')
      return
    }

    setLoadState('loading')
    try {
      const next = await loadMatchDetail(videoId, {
        videos: videoService,
        teams: teamService,
        jobs: analysisJobService,
      })
      setModel(next)
      setLoadState(next ? 'success' : 'not-found')
      setIsPollingDisconnected(false)
    } catch {
      setLoadState('error')
    }
  }, [videoId])

  useEffect(() => {
    void load()
  }, [load])

  const latestJob = model?.latestJob
  useEffect(() => {
    if (!latestJob || (latestJob.status !== 'QUEUED' && latestJob.status !== 'RUNNING')) return

    const poller = createAnalysisJobDetailPoller({
      load: () => analysisJobService.get(latestJob.id, latestJob.teamId),
      onJob: (job) => {
        setIsPollingDisconnected(false)
        setModel((current) => current ? { ...current, latestJob: job } : current)
      },
      onError: () => setIsPollingDisconnected(true),
    })
    poller.start(latestJob.status)
    return () => poller.stop()
  }, [latestJob])

  const displayState = useMemo(() => model ? displayStateFor(model) : null, [model])

  if (loadState === 'loading') {
    return (
      <div className="py-12">
        <Link to="/partidos" className="inline-flex items-center gap-2 text-sm font-semibold text-[#A3ABBA]">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Partidos
        </Link>
        <div className="mt-10 flex min-h-[50vh] items-center justify-center gap-3 text-sm text-[#A3ABBA]" aria-live="polite" aria-busy="true">
          <LoaderCircle className="h-5 w-5 animate-spin text-[#FF6A1F] motion-reduce:animate-none" aria-hidden="true" />
          Cargando partido…
        </div>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="py-12">
        <Link to="/partidos" className="inline-flex items-center gap-2 text-sm font-semibold text-[#A3ABBA] hover:text-[#F4F5F7]">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Partidos
        </Link>
        <section className="mt-10 flex flex-col items-start gap-5 border-y border-red-500/20 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="scout-display text-4xl font-bold text-[#F4F5F7]">No pudimos cargar este partido</h1>
            <p className="mt-3 text-sm text-[#A3ABBA]">Revisá la conexión e intentá nuevamente.</p>
          </div>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => void load()}>
            <RefreshCw aria-hidden="true" className="h-4 w-4" /> Reintentar
          </Button>
        </section>
      </div>
    )
  }

  if (loadState === 'not-found' || !model || !displayState) {
    return (
      <div className="py-12">
        <Link to="/partidos" className="inline-flex items-center gap-2 text-sm font-semibold text-[#A3ABBA] hover:text-[#F4F5F7]">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Partidos
        </Link>
        <section className="mt-10 border-y border-[#252B38] py-12">
          <h1 className="scout-display text-4xl font-bold text-[#F4F5F7]">Partido no encontrado</h1>
          <p className="mt-3 text-sm text-[#A3ABBA]">El video no existe o ya no está disponible.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="pb-16 pt-8">
      <Link
        to="/partidos"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#A3ABBA] transition-colors hover:text-[#F4F5F7]"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Partidos
      </Link>

      <header className="mt-7 border-b border-[#252B38] pb-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="scout-display max-w-4xl text-balance text-[clamp(3.2rem,8vw,5rem)] font-extrabold text-[#F4F5F7]">
              {model.video.title || 'Video sin título'}
            </h1>
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#A3ABBA] sm:text-base">
              <span>{model.team?.name ?? 'Equipo no disponible'}</span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span>Fecha de carga · {formatUploadDate(model.video.uploadedAt)}</span>
            </p>
          </div>
          <span className={`w-fit shrink-0 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${stateTone(displayState)}`}>
            {matchLibraryDisplayLabel(displayState)}
          </span>
        </div>
      </header>

      <nav className="flex overflow-x-auto border-b border-[#252B38] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Secciones del partido">
        {TABS.map(({ id, label, icon: Icon }) => {
          const selected = activeTab === id
          return (
            <Link
              key={id}
              to={matchDetailPath(model.video.id, id)}
              role="tab"
              aria-selected={selected}
              className={`relative inline-flex min-h-[58px] shrink-0 items-center gap-2 px-5 text-base font-semibold transition-colors ${
                selected ? 'text-[#F4F5F7]' : 'text-[#A3ABBA] hover:text-[#F4F5F7]'
              }`}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {label}
              {selected ? <span className="absolute inset-x-4 bottom-0 h-[3px] bg-[#FF6A1F]" /> : null}
            </Link>
          )
        })}
      </nav>

      {isPollingDisconnected ? <div className="mt-6"><AnalysisPollingNotice /></div> : null}

      <main className="pt-8">
        {activeTab === 'video' ? <MatchVideoTab video={model.video} /> : null}
        {activeTab === 'reporte' ? <MatchReportTab model={model} onRetry={() => void load()} /> : null}
        {activeTab === 'clips' ? <MatchClipsTab videoId={model.video.id} /> : null}
      </main>
    </div>
  )
}

export default MatchDetailPage
