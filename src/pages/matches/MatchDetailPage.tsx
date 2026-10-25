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
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnalysisPollingNotice } from '@/components/analysis/AnalysisPollingNotice'
import { BasketballCourtLines } from '@/components/analysis/BasketballCourtLines'
import { ProcessingShotArc } from '@/components/analysis/ProcessingShotArc'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { AnalysisWorkspaceVideo } from '@/pages/analysis/AnalysisWorkspaceVideo'
import {
  AnalysisJobResultsWorkspace,
  type AnalysisJobResultsSection,
} from '@/pages/analysis/AnalysisJobResultsWorkspace'
import { analysisJobDetailPath } from '@/pages/analysis/analysis-job-detail'
import { createAnalysisJobDetailPoller } from '@/pages/analysis/analysis-job-detail-polling'
import {
  addCreatedJobToAnalysisCatalog,
  upsertVideoInAnalysisCatalog,
} from '@/pages/analysis/analysis-job-catalog-store'
import { createAnalysisJobSubmission } from '@/pages/videos/analysis-job-creation'
import { matchDetailPath } from '@/pages/partidos/match-routes'
import { LINKED_MATCH_FALLBACK, formatMatchDate, linkedMatchLabel } from '@/pages/partidos/match-videos'
import { isApiAuthenticationError } from '@/services/api/errors'
import {
  analysisJobService,
  clipCollectionService,
  getVideoByIdForTeam,
  matchService,
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
  clipDisplayTitle,
  clipTimeRange,
  loadMatchClips,
  loadMatchDetail,
  matchAnalysisElapsedLabel,
  videoAnalysisPath,
  videoDetailPath,
  resolveMatchDetailTab,
  resolveMatchReportSection,
  type MatchClipsModel,
  type MatchDetailModel,
  type MatchDetailTab,
  type MatchReportSection,
} from './match-detail'
import { createMatchVideoPreparationPoller } from './match-video-preparation-polling'

type LoadState = 'loading' | 'success' | 'error' | 'not-found'

const TABS: Array<{
  id: MatchDetailTab
  label: string
  icon: typeof Play
}> = [
  { id: 'video', label: 'Video', icon: Play },
  { id: 'reporte', label: 'Análisis IA', icon: BarChart3 },
  { id: 'clips', label: 'Clips', icon: Clapperboard },
]

const REPORT_SECTIONS: Array<{
  id: MatchReportSection
  label: string
  description: string
  workspaceSection: Exclude<AnalysisJobResultsSection, 'details'>
}> = [
  { id: 'resumen', label: 'Resumen', description: 'Una lectura general del análisis.', workspaceSection: 'overview' },
  { id: 'tiros', label: 'Tiros', description: 'Ubicaciones, resultados y evidencia disponible.', workspaceSection: 'shots' },
  { id: 'movimiento', label: 'Movimiento', description: 'Recorridos y mapas de calor por jugador.', workspaceSection: 'movement' },
  { id: 'similares', label: 'Similares', description: 'Comparaciones con otros análisis del equipo.', workspaceSection: 'similar' },
]

function workspaceSectionFor(section: MatchReportSection): Exclude<AnalysisJobResultsSection, 'details'> {
  return REPORT_SECTIONS.find((candidate) => candidate.id === section)?.workspaceSection ?? 'overview'
}

function reportSectionFor(section: AnalysisJobResultsSection): MatchReportSection {
  return REPORT_SECTIONS.find((candidate) => candidate.workspaceSection === section)?.id ?? 'resumen'
}

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
  if (state === 'analysis-error' || state === 'material-error') return 'border-red-500/30 bg-red-500/10 text-red-300'
  if (state === 'queued' || state === 'analyzing') {
    return 'border-[#FF6A1F]/40 bg-[#FF6A1F]/10 text-[#FF9A68]'
  }
  if (state === 'preparing-file') return 'border-amber-500/30 bg-amber-500/10 text-amber-200'
  return 'border-white/10 bg-white/[0.04] text-[#A3ABBA]'
}

/** Link from the video header to the match this video is linked to; never blocks the page. */
function LinkedMatchLink({ matchId }: { matchId: string }) {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLabel(null)
    void (async () => {
      try {
        const { match } = await matchService.getWithParticipants(matchId)
        const teams = await teamService.list()
        const home = teams.find((team) => team.id === match.homeTeamId)
        const away = teams.find((team) => team.id === match.awayTeamId)
        if (!home || !away) throw new Error('team unavailable')
        if (active) setLabel(linkedMatchLabel(home.name, away.name, formatMatchDate(match.matchDate)))
      } catch {
        if (active) setLabel(LINKED_MATCH_FALLBACK)
      }
    })()
    return () => {
      active = false
    }
  }, [matchId])

  return (
    <Link
      to={matchDetailPath(matchId)}
      className="mt-2 inline-block text-sm font-semibold text-[#FF9A68] underline-offset-4 hover:underline"
    >
      {label ?? LINKED_MATCH_FALLBACK}
    </Link>
  )
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
    <section className="space-y-4" aria-label="Reproducción y clips del video">
      <AnalysisWorkspaceVideo
        video={video}
        videoId={video.id}
        teamId={video.teamId}
        title={video.title}
        minimalChrome
      />
      <div className="flex flex-col gap-4 border-y border-[#252B38] py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#F4F5F7]">¿Querés guardar un fragmento?</p>
          <p className="mt-1 text-xs leading-relaxed text-[#A3ABBA]">
            Elegí una colección y usá el editor manual, sin iniciar un análisis IA.
          </p>
        </div>
        <Button asChild className="shrink-0 rounded-full">
          <Link to={`/videos/${encodeURIComponent(video.id)}/colecciones`}>
            <Clapperboard aria-hidden="true" className="h-4 w-4" />
            Guardar clip
          </Link>
        </Button>
      </div>
    </section>
  )
}

function ReportStructurePreview({ title }: { title: string }) {
  return (
    <section aria-labelledby="report-structure-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#788397]">Estructura del análisis</p>
          <h3 id="report-structure-title" className="scout-display mt-1 text-2xl font-bold text-[#F4F5F7]">{title}</h3>
        </div>
        <p className="text-xs text-[#788397]">Sin datos anticipados</p>
      </div>
      <ol className="grid divide-y divide-[#252B38] border-y border-[#252B38] lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        {REPORT_SECTIONS.map((section, index) => (
          <li key={section.id} className="min-w-0 py-4 lg:px-5 lg:first:pl-0 lg:last:pr-0">
            <p className="scout-display text-xl font-bold text-[#F4F5F7]">
              <span className="mr-2 tabular-nums text-[#788397]">{String(index + 1).padStart(2, '0')}</span>
              {section.label}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#A3ABBA]">{section.description}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function MatchReportTab({
  model,
  onRetry,
  activeSection,
  onSectionChange,
  onJobUpdated,
  onStartAnalysis,
  isCreatingAnalysis,
  creationError,
}: {
  model: MatchDetailModel
  onRetry: () => void
  activeSection: MatchReportSection
  onSectionChange: (section: AnalysisJobResultsSection) => void
  onJobUpdated: (job: ProcessingJob) => void
  onStartAnalysis: () => void
  isCreatingAnalysis: boolean
  creationError: string | null
}) {
  const { latestJob: job, video } = model

  if (model.jobsUnavailable) {
    return (
      <section className="flex flex-col items-start gap-5 border-y border-amber-500/25 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="scout-display text-3xl font-bold text-[#F4F5F7]">Estado no disponible</h2>
          <p className="mt-2 text-sm text-[#A3ABBA]">
            No pudimos verificar el historial de análisis. No vamos a asumir que este video está sin analizar.
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
    const materialState = videoMaterialState(video)
    const ready = materialState === 'ready'
    const failed = materialState === 'failed'
    return (
      <section className="space-y-10 py-3">
        <div className="grid gap-8 border-b border-[#252B38] pb-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF6A1F]">Análisis IA del video</p>
            <h2 className="scout-display mt-3 max-w-4xl text-[clamp(2.6rem,6vw,4.2rem)] font-extrabold leading-[0.98] text-[#F4F5F7]">
              {failed ? 'No se pudo preparar este archivo' : 'Este video todavía no tiene análisis'}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#A3ABBA]">
              {failed
                ? 'El material no quedó disponible para reproducirlo o analizarlo.'
                : 'Analizá el video para organizar los resultados detectados y la evidencia disponible en un mismo lugar.'}
            </p>
            {ready ? (
              <Button
                type="button"
                disabled={isCreatingAnalysis}
                onClick={onStartAnalysis}
                className="mt-6 h-[54px] rounded-full bg-[#FF6A1F] px-8 text-base font-semibold text-white shadow-none hover:bg-[#ff7b38]"
              >
                {isCreatingAnalysis ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <ArrowRight aria-hidden="true" className="h-4 w-4" />}
                {isCreatingAnalysis ? 'Iniciando…' : 'Analizar video'}
              </Button>
            ) : failed ? null : (
              <p className="mt-6 max-w-sm text-sm text-[#A3ABBA]">El análisis estará disponible cuando termine la preparación del archivo.</p>
            )}
            {creationError ? <p className="mt-3 text-sm text-red-300" role="alert">{creationError}</p> : null}
          </div>
          <ProcessingShotArc
            variant={failed ? 'failed' : ready ? 'waiting' : 'preparing'}
            presentation="report"
          />
        </div>
        <ReportStructurePreview title="Lo que vas a poder revisar" />
      </section>
    )
  }

  if (job.status === 'QUEUED') {
    const hasProgress = job.progressPercent != null
    return (
      <section className="space-y-9 py-3" aria-live="polite">
        <div className="grid gap-8 border-b border-[#252B38] pb-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF6A1F]">Análisis solicitado</p>
            <h2 className="scout-display mt-3 text-[clamp(2.7rem,6vw,4.2rem)] font-extrabold leading-[0.98] text-[#F4F5F7]">
              Tu video está en cola
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#A3ABBA]">
              La solicitud ya fue recibida. El análisis se actualizará acá cuando el procesamiento comience, sin que tengas que salir del video.
            </p>
            <dl className="mt-6 flex flex-wrap gap-x-12 gap-y-5 border-y border-[#252B38] py-4">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#788397]">Solicitud recibida</dt>
                <dd className="mt-1 font-medium text-[#F4F5F7]">{formatUploadDate(job.createdAt)}</dd>
              </div>
              {hasProgress ? (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#788397]">Progreso informado</dt>
                  <dd className="scout-display mt-1 text-3xl font-bold tabular-nums text-[#F4F5F7]">{job.progressPercent}%</dd>
                </div>
              ) : null}
            </dl>
          </div>
          <ProcessingShotArc variant="queued" presentation="report" />
        </div>
        <ReportStructurePreview title="El análisis aparecerá acá" />
      </section>
    )
  }

  if (job.status === 'RUNNING') {
    const elapsed = matchAnalysisElapsedLabel(job.startedAt)
    const hasProgress = job.progressPercent != null
    return (
      <section className="space-y-9 py-3" aria-live="polite">
        <div className="grid gap-8 border-b border-[#252B38] pb-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF6A1F]">Análisis en curso</p>
            <h2 className="scout-display mt-3 text-[clamp(2.7rem,6vw,4.2rem)] font-extrabold leading-[0.98] text-[#F4F5F7]">
              Estamos analizando tu video
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#A3ABBA]">Los resultados aparecerán acá cuando termine.</p>
            {hasProgress ? (
              <span className="scout-display mt-5 block text-6xl font-extrabold tabular-nums text-[#F4F5F7]">
                {job.progressPercent}%
              </span>
            ) : null}
            <dl className="mt-6 flex flex-wrap gap-x-12 gap-y-5 border-y border-[#252B38] py-4">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#788397]">Estado</dt>
                <dd className="mt-1 flex items-center gap-2 font-medium text-[#F4F5F7]"><span className="h-2 w-2 rounded-full bg-[#FF6A1F] animate-pulse motion-reduce:animate-none" aria-hidden="true" />Análisis en curso</dd>
              </div>
              {elapsed ? (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#788397]">Tiempo transcurrido</dt>
                  <dd className="mt-1 font-medium tabular-nums text-[#F4F5F7]">{elapsed}</dd>
                </div>
              ) : null}
            </dl>
          </div>
          <ProcessingShotArc
            variant="running"
            progressPercent={job.progressPercent}
            presentation="report"
          />
        </div>
        <ReportStructurePreview title="El análisis se está preparando" />
      </section>
    )
  }

  if (job.status === 'FAILED') {
    return (
      <section className="space-y-9 py-3">
        <div className="grid gap-8 border-b border-red-500/20 pb-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-300">Análisis interrumpido</p>
            <h2 className="scout-display mt-3 text-[clamp(2.7rem,6vw,4.2rem)] font-extrabold leading-[0.98] text-[#F4F5F7]">
              No se pudo analizar este video
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#A3ABBA]">
              El video y sus clips siguen disponibles. Podés iniciar un análisis nuevo con el mismo material.
            </p>
            <p className="mt-2 max-w-2xl text-xs text-[#788397]">El detalle técnico de esta ejecución queda disponible como información secundaria para soporte.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" disabled={isCreatingAnalysis} onClick={onStartAnalysis} className="h-[52px] rounded-full bg-[#FF6A1F] px-7 text-base font-semibold text-white shadow-none hover:bg-[#ff7b38]">
                {isCreatingAnalysis ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <ArrowRight aria-hidden="true" className="h-4 w-4" />}
                {isCreatingAnalysis ? 'Iniciando…' : 'Reintentar análisis'}
              </Button>
              <Button asChild variant="outline" className="h-[52px] rounded-full border-[#3A4254] bg-transparent px-6 text-[#F4F5F7] hover:border-[#FF6A1F] hover:bg-transparent hover:text-[#FF9A68]">
                <Link to={analysisJobDetailPath(job)}>Ver detalles técnicos</Link>
              </Button>
            </div>
            {creationError ? <p className="mt-3 text-sm text-red-300" role="alert">{creationError}</p> : null}
          </div>
          <ProcessingShotArc variant="failed" presentation="report" />
        </div>
        <ReportStructurePreview title="El análisis todavía no está disponible" />
      </section>
    )
  }

  return (
    <section className="space-y-5">
      <nav
        className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Secciones del análisis IA"
      >
        {REPORT_SECTIONS.map((section, index) => {
          const selected = activeSection === section.id
          return (
            <Link
              key={section.id}
              to={videoAnalysisPath(video.id, section.id)}
              aria-current={selected ? 'page' : undefined}
              className={`scout-display relative inline-flex min-h-14 shrink-0 items-center px-3 text-xl font-bold tracking-[0.01em] transition-colors ${
                selected ? 'text-[#F4F5F7]' : 'text-[#A3ABBA] hover:text-[#F4F5F7]'
              }`}
            >
              <span className={`mr-2 tabular-nums ${selected ? 'text-[#FF6A1F]' : 'text-[#788397]'}`}>{String(index + 1).padStart(2, '0')}</span>
              {section.label}
              {selected ? <span className="absolute bottom-0 left-3 h-[3px] w-10 bg-[#FF6A1F]" /> : null}
            </Link>
          )
        })}
      </nav>

      <AnalysisJobResultsWorkspace
        job={job}
        video={video}
        team={model.team}
        activeSection={workspaceSectionFor(activeSection)}
        onSectionChange={onSectionChange}
        onJobUpdated={onJobUpdated}
        showNavigation={false}
        includeDetails={false}
        presentation="match-report"
      />
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
          <h2 className="scout-display mt-2 text-4xl font-bold text-[#F4F5F7]">Clips del video</h2>
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
                      <span className="min-w-0">
                        <span className="scout-display block text-2xl font-bold text-[#FF6A1F]">
                          {clipDisplayTitle(item)}
                        </span>
                        {item.description?.trim() ? (
                          <span className="mt-1 block text-xs font-medium uppercase tracking-[0.12em] text-[#A3ABBA]">
                            Clip {item.position} · {clipTimeRange(item)}
                          </span>
                        ) : null}
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
  const { user } = useAuth()
  const { videoId = '' } = useParams<{ videoId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const activeTab = resolveMatchDetailTab(searchParams)
  const activeReportSection = resolveMatchReportSection(searchParams)
  const isCompactReportHeader = activeTab === 'reporte'
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [model, setModel] = useState<MatchDetailModel | null>(null)
  const [isPollingDisconnected, setIsPollingDisconnected] = useState(false)
  const [isPreparationPollingStopped, setIsPreparationPollingStopped] = useState(false)
  const [isCreatingAnalysis, setIsCreatingAnalysis] = useState(false)
  const [creationError, setCreationError] = useState<string | null>(null)

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
      setIsPreparationPollingStopped(false)
    } catch {
      setLoadState('error')
    }
  }, [videoId])

  useEffect(() => {
    void load()
  }, [load])

  const preparationVideoId = model?.video.id ?? null
  const preparationTeamId = model?.video.teamId ?? null
  const preparationStatus = model?.video.status ?? null
  useEffect(() => {
    if (loadState !== 'success' || !preparationVideoId || !preparationTeamId || preparationStatus !== 'processing') return

    const poller = createMatchVideoPreparationPoller({
      load: () => getVideoByIdForTeam(preparationVideoId, preparationTeamId),
      onVideo: (video) => {
        if (!user || !upsertVideoInAnalysisCatalog(user.id, video)) return
        setIsPollingDisconnected(false)
        setIsPreparationPollingStopped(false)
        setModel((current) => current?.video.id === video.id
          ? { ...current, video }
          : current)
      },
      onError: () => setIsPollingDisconnected(true),
      onExhausted: () => {
        setIsPollingDisconnected(false)
        setIsPreparationPollingStopped(true)
      },
    })
    poller.start(preparationStatus)
    return () => poller.stop()
  }, [loadState, preparationStatus, preparationTeamId, preparationVideoId, user])

  const handleJobUpdated = useCallback((updatedJob: ProcessingJob) => {
    if (!user || !addCreatedJobToAnalysisCatalog(user.id, updatedJob)) return
    setModel((current) => current?.latestJob?.id === updatedJob.id
      ? { ...current, latestJob: updatedJob }
      : current)
  }, [user])

  const latestJob = model?.latestJob
  useEffect(() => {
    if (!latestJob || (latestJob.status !== 'QUEUED' && latestJob.status !== 'RUNNING')) return

    const poller = createAnalysisJobDetailPoller({
      load: () => analysisJobService.get(latestJob.id, latestJob.teamId),
      onJob: (job) => {
        setIsPollingDisconnected(false)
        handleJobUpdated(job)
      },
      onError: () => setIsPollingDisconnected(true),
    })
    poller.start(latestJob.status)
    return () => poller.stop()
  }, [handleJobUpdated, latestJob])

  const analysisVideoId = model?.video.id ?? null
  const analysisTeamId = model?.video.teamId ?? null
  const analysisSubmission = useMemo(() => {
    if (!analysisVideoId || !analysisTeamId) return null

    return createAnalysisJobSubmission({
      create: () => analysisJobService.create(analysisVideoId, { teamId: analysisTeamId }),
      onCreated: (job) => {
        if (!user || !addCreatedJobToAnalysisCatalog(user.id, job)) return
        setCreationError(null)
        setModel((current) => current?.video.id === job.videoId
          ? { ...current, latestJob: job, jobsUnavailable: false }
          : current)
      },
      onError: (error) => {
        if (!isApiAuthenticationError(error)) {
          setCreationError('No pudimos iniciar el análisis. El video sigue disponible para reintentar.')
        }
      },
      onSubmittingChange: setIsCreatingAnalysis,
    })
  }, [analysisTeamId, analysisVideoId, user])

  const handleStartAnalysis = useCallback(() => {
    if (!analysisSubmission || !model || videoMaterialState(model.video) !== 'ready') return
    setCreationError(null)
    void analysisSubmission.submit()
  }, [analysisSubmission, model])

  const displayState = useMemo(() => model ? displayStateFor(model) : null, [model])

  const handleReportSectionChange = useCallback((section: AnalysisJobResultsSection) => {
    if (!videoId) return
    navigate(videoAnalysisPath(videoId, reportSectionFor(section)))
  }, [navigate, videoId])

  if (loadState === 'loading') {
    return (
      <div className="py-12">
        <Link to="/videos" className="inline-flex items-center gap-2 text-sm font-semibold text-[#A3ABBA]">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Videos
        </Link>
        <div className="mt-10 flex min-h-[50vh] items-center justify-center gap-3 text-sm text-[#A3ABBA]" aria-live="polite" aria-busy="true">
          <LoaderCircle className="h-5 w-5 animate-spin text-[#FF6A1F] motion-reduce:animate-none" aria-hidden="true" />
          Cargando video…
        </div>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="py-12">
        <Link to="/videos" className="inline-flex items-center gap-2 text-sm font-semibold text-[#A3ABBA] hover:text-[#F4F5F7]">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Videos
        </Link>
        <section className="mt-10 flex flex-col items-start gap-5 border-y border-red-500/20 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="scout-display text-4xl font-bold text-[#F4F5F7]">No pudimos cargar este video</h1>
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
        <Link to="/videos" className="inline-flex items-center gap-2 text-sm font-semibold text-[#A3ABBA] hover:text-[#F4F5F7]">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Videos
        </Link>
        <section className="mt-10 border-y border-[#252B38] py-12">
          <h1 className="scout-display text-4xl font-bold text-[#F4F5F7]">Video no encontrado</h1>
          <p className="mt-3 text-sm text-[#A3ABBA]">El video no existe o ya no está disponible.</p>
        </section>
      </div>
    )
  }

  return (
    <div className={isCompactReportHeader ? 'pb-16 pt-4 sm:pt-5' : 'pb-16 pt-8'}>
      <Link
        to="/videos"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#A3ABBA] transition-colors hover:text-[#F4F5F7]"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Videos
      </Link>

      <header className={isCompactReportHeader ? 'mt-3 border-b border-[#252B38] pb-4' : 'mt-7 border-b border-[#252B38] pb-8'}>
        <div className={isCompactReportHeader
          ? 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'
          : 'flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between'}>
          <div className={isCompactReportHeader ? 'min-w-0 flex-1' : 'min-w-0'}>
            <h1 className={isCompactReportHeader
              ? 'scout-display text-[clamp(2rem,4vw,3rem)] font-extrabold leading-none text-[#F4F5F7] sm:truncate sm:whitespace-nowrap'
              : 'scout-display max-w-4xl text-balance text-[clamp(3.2rem,8vw,5rem)] font-extrabold text-[#F4F5F7]'}>
              {model.video.title || 'Video sin título'}
            </h1>
            <p className={`${isCompactReportHeader ? 'mt-1' : 'mt-4'} flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#A3ABBA] ${isCompactReportHeader ? '' : 'sm:text-base'}`}>
              <span>{model.team?.name ?? 'Equipo no disponible'}</span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span>Fecha de carga · {formatUploadDate(model.video.uploadedAt)}</span>
            </p>
            {model.video.linkedMatchId ? <LinkedMatchLink matchId={model.video.linkedMatchId} /> : null}
          </div>
          <span className={`w-fit shrink-0 rounded-full border text-xs font-semibold uppercase tracking-[0.14em] ${isCompactReportHeader ? 'px-3 py-1.5' : 'px-4 py-2'} ${stateTone(displayState)}`}>
            {matchLibraryDisplayLabel(displayState)}
          </span>
        </div>
      </header>

      <nav className="flex overflow-x-auto border-b border-[#252B38] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Secciones del video">
        {TABS.map(({ id, label, icon: Icon }) => {
          const selected = activeTab === id
          return (
            <Link
              key={id}
              to={videoDetailPath(model.video.id, id)}
              role="tab"
              aria-selected={selected}
              className={`relative inline-flex ${isCompactReportHeader ? 'min-h-12' : 'min-h-[58px]'} shrink-0 items-center gap-2 px-5 text-base font-semibold transition-colors ${
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

      {isPreparationPollingStopped ? (
        <section className="mt-6 flex flex-col items-start gap-4 border-y border-amber-500/25 py-4 sm:flex-row sm:items-center sm:justify-between" role="status">
          <p className="text-sm text-amber-100">La preparación sigue pendiente. Actualizá el estado para continuar verificándola.</p>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => void load()}>
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Actualizar estado
          </Button>
        </section>
      ) : isPollingDisconnected ? (
        model.video.status === 'processing' ? (
          <section className="mt-6 border-y border-amber-500/25 py-4 text-sm text-amber-100" role="status">
            No pudimos actualizar la preparación del archivo. Mostramos el último estado conocido y seguimos intentando.
          </section>
        ) : <div className="mt-6"><AnalysisPollingNotice /></div>
      ) : null}

      <main className={isCompactReportHeader ? 'pt-4' : 'pt-8'}>
        {activeTab === 'video' ? <MatchVideoTab video={model.video} /> : null}
        {activeTab === 'reporte' ? (
          <MatchReportTab
            model={model}
            onRetry={() => void load()}
            activeSection={activeReportSection}
            onSectionChange={handleReportSectionChange}
            onJobUpdated={handleJobUpdated}
            onStartAnalysis={handleStartAnalysis}
            isCreatingAnalysis={isCreatingAnalysis}
            creationError={creationError}
          />
        ) : null}
        {activeTab === 'clips' ? <MatchClipsTab videoId={model.video.id} /> : null}
      </main>
    </div>
  )
}

export default MatchDetailPage
