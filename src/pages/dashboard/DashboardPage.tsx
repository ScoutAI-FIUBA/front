import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CircleAlert, LoaderCircle, Plus, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BasketballCourtLines } from '@/components/analysis/BasketballCourtLines'
import { AnalysisPollingNotice } from '@/components/analysis/AnalysisPollingNotice'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { useAnalysisJobCatalog } from '@/pages/analysis/use-analysis-job-catalog'
import {
  buildMatchLibrary,
  matchLibraryDisplayLabel,
  matchLibraryDisplayState,
  type MatchLibraryDisplayState,
  type MatchLibraryItem,
} from '@/pages/matches/match-library'
import { videoDetailPath } from '@/pages/matches/match-detail'
import {
  cachedMatchPoster,
  requestMatchPoster,
} from '@/pages/matches/match-posters'
import { videoUploadPath } from '@/pages/videos/video-upload-navigation'
import { getVideoByIdForTeam } from '@/services/registry'
import { selectHomePriorityMatch, selectRecentHomeMatches } from './home-priority'

function formatUploadDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function stateTone(state: MatchLibraryDisplayState): string {
  if (state === 'report-ready') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  if (state === 'analysis-error' || state === 'material-error') return 'border-red-500/30 bg-red-500/10 text-red-300'
  if (state === 'queued' || state === 'analyzing') return 'border-[#FF6A1F]/40 bg-[#FF6A1F]/10 text-[#FF9A68]'
  if (state === 'preparing-file') return 'border-amber-500/30 bg-amber-500/10 text-amber-200'
  return 'border-white/10 bg-white/[0.04] text-[#A3ABBA]'
}

function priorityActionLabel(state: MatchLibraryDisplayState): string {
  if (state === 'report-ready') return 'Ver análisis'
  if (state === 'analysis-error' || state === 'material-error') return 'Resolver problema'
  if (state === 'unanalyzed') return 'Analizar video'
  if (state === 'unavailable') return 'Ver video'
  return 'Ver progreso'
}

function CourtFallback({ className = '' }: { className?: string }) {
  return (
    <div className={`overflow-hidden bg-[#11151D] ${className}`}>
      <div className="relative h-full w-full">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border border-[#FF6A1F]/15" />
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full p-7 text-[#657089] opacity-60"
          viewBox="0 0 28 15"
          preserveAspectRatio="xMidYMid meet"
        >
          <BasketballCourtLines lengthM={28} widthM={15} />
        </svg>
      </div>
    </div>
  )
}

function PriorityMatch({
  item,
  posterUrl,
}: {
  item: MatchLibraryItem
  posterUrl?: string
}) {
  const displayState = matchLibraryDisplayState(item)
  const progress = item.analysisState === 'RUNNING' ? item.latestJob?.progressPercent : null

  return (
    <section aria-labelledby="priority-match-title" className="grid overflow-hidden border-y border-[#252B38] lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
      <div className="relative min-h-[330px] border-b border-[#252B38] lg:min-h-[390px] lg:border-b-0 lg:border-r">
        {posterUrl ? (
          <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <CourtFallback className="absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D12]/75 via-transparent to-[#0B0D12]/10" />
        <span className={`absolute left-6 top-6 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${stateTone(displayState)}`}>
          {matchLibraryDisplayLabel(displayState)}
        </span>
      </div>

      <div className="flex flex-col justify-center px-7 py-9 lg:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF6A1F]">Continuar</p>
        <h2 id="priority-match-title" className="scout-display mt-4 text-balance text-[clamp(2.7rem,5vw,4.5rem)] font-extrabold text-[#F4F5F7]">
          {item.video.title || 'Video sin título'}
        </h2>
        <p className="mt-4 text-sm text-[#A3ABBA]">
          {item.team?.name ?? 'Equipo no disponible'} · Fecha de carga {formatUploadDate(item.video.uploadedAt)}
        </p>

        {progress != null ? (
          <div className="mt-7 border-l-2 border-[#FF6A1F] pl-4" role="status" aria-label={`Análisis del video: ${progress}%`}>
            <p className="scout-display text-4xl font-bold text-[#F4F5F7]">{progress}%</p>
            <p className="mt-1 text-sm text-[#A3ABBA]">Análisis en curso</p>
          </div>
        ) : null}

        <Button asChild className="mt-8 h-[52px] self-start rounded-full bg-[#FF6A1F] px-7 text-base font-semibold text-white shadow-none hover:bg-[#ff7b38]">
          <Link to={videoDetailPath(item.video.id, 'reporte')}>
            {priorityActionLabel(displayState)}
            <ArrowRight aria-hidden="true" className="h-5 w-5" />
          </Link>
        </Button>
      </div>
    </section>
  )
}

function RecentMatchRow({
  item,
  posterUrl,
}: {
  item: MatchLibraryItem
  posterUrl?: string
}) {
  const displayState = matchLibraryDisplayState(item)

  return (
    <Link
      to={videoDetailPath(item.video.id)}
      className="group grid min-h-[132px] gap-5 border-b border-[#252B38] py-5 transition-colors last:border-b-0 hover:bg-white/[0.02] sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="relative h-24 overflow-hidden border border-[#252B38] bg-[#11151D]">
        {posterUrl ? (
          <img src={posterUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <CourtFallback className="h-full w-full" />
        )}
      </div>
      <div className="min-w-0">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] ${stateTone(displayState)}`}>
          {matchLibraryDisplayLabel(displayState)}
        </span>
        <h3 className="scout-display mt-3 truncate text-2xl font-bold text-[#F4F5F7]">{item.video.title || 'Video sin título'}</h3>
        <p className="mt-1 text-sm text-[#A3ABBA]">
          {item.team?.name ?? 'Equipo no disponible'} · {formatUploadDate(item.video.uploadedAt)}
        </p>
      </div>
      <ArrowRight aria-hidden="true" className="hidden h-5 w-5 text-[#6F788A] transition-colors group-hover:text-[#FF6A1F] sm:block" />
    </Link>
  )
}

function HomeLoading() {
  return (
    <div aria-label="Cargando Inicio" className="space-y-12" aria-busy="true">
      <div className="grid overflow-hidden border-y border-[#252B38] lg:grid-cols-2">
        <div className="h-[390px] animate-pulse bg-[#151922] motion-reduce:animate-none" />
        <div className="space-y-5 px-10 py-12">
          <div className="h-3 w-24 animate-pulse bg-[#252B38] motion-reduce:animate-none" />
          <div className="h-16 max-w-md animate-pulse bg-[#151922] motion-reduce:animate-none" />
          <div className="h-4 w-64 animate-pulse bg-[#252B38] motion-reduce:animate-none" />
          <div className="h-12 w-40 animate-pulse rounded-full bg-[#252B38] motion-reduce:animate-none" />
        </div>
      </div>
      <div className="space-y-4 border-y border-[#252B38] py-5">
        {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-24 animate-pulse bg-[#151922] motion-reduce:animate-none" />)}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { catalog, loadState, isPollingDisconnected, refresh } = useAnalysisJobCatalog()
  const items = useMemo(() => catalog ? buildMatchLibrary(catalog) : [], [catalog])
  const priority = useMemo(() => selectHomePriorityMatch(items), [items])
  const recent = useMemo(
    () => selectRecentHomeMatches(items, priority?.video.id, 3),
    [items, priority?.video.id],
  )
  const visibleMatches = useMemo(
    () => [priority, ...recent].filter((item): item is MatchLibraryItem => Boolean(item)),
    [priority, recent],
  )
  const [posterUrls, setPosterUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    setPosterUrls({})
  }, [userId])

  useEffect(() => {
    if (!userId) return
    let active = true
    for (const { video } of visibleMatches) {
      const cached = cachedMatchPoster(userId, video.id)
      if (cached) {
        setPosterUrls((current) => current[video.id] === cached ? current : { ...current, [video.id]: cached })
        continue
      }

      void requestMatchPoster(userId, video, getVideoByIdForTeam).then((posterUrl) => {
        if (!active || !posterUrl) return
        setPosterUrls((current) => current[video.id] === posterUrl ? current : { ...current, [video.id]: posterUrl })
      })
    }
    return () => { active = false }
  }, [userId, visibleMatches])

  const hasPartialFailure = catalog?.partialFailures.some((failure) => failure.scope !== 'active-job') ?? false

  return (
    <div className="pb-16 pt-6 sm:pt-10">
      <header className="flex flex-col gap-7 border-b border-[#252B38] pb-9 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#FF6A1F]">Inicio</p>
          <h1 className="scout-display text-[clamp(3.5rem,8vw,5.4rem)] font-extrabold text-[#F4F5F7]">Seguí donde quedaste</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[#A3ABBA] sm:text-lg">
            Retomá el video que necesita tu atención o abrí uno de los últimos análisis.
          </p>
        </div>
        <Button asChild className="h-[54px] shrink-0 rounded-full bg-[#FF6A1F] px-7 text-base font-semibold text-white shadow-none hover:bg-[#ff7b38]">
          <Link to={videoUploadPath()}>
            <Plus aria-hidden="true" className="h-5 w-5" />
            Subir video
          </Link>
        </Button>
      </header>

      <div className="pt-8">
        {loadState === 'loading' && !catalog ? <HomeLoading /> : null}

        {loadState === 'session-expired' ? (
          <div className="flex min-h-40 items-center gap-3 border-y border-[#252B38] py-8 text-sm text-[#A3ABBA]">
            <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin text-[#FF6A1F]" />
            Tu sesión terminó. Redirigiendo al ingreso…
          </div>
        ) : null}

        {loadState === 'error' && !catalog ? (
          <section role="alert" className="flex min-h-52 flex-col items-start justify-center border-y border-[#252B38] py-10">
            <div className="flex items-center gap-3 text-red-300">
              <CircleAlert aria-hidden="true" className="h-5 w-5" />
              <h2 className="text-lg font-semibold">No pudimos cargar tus videos</h2>
            </div>
            <p className="mt-3 text-sm text-[#A3ABBA]">Revisá tu conexión e intentá nuevamente.</p>
            <Button type="button" variant="outline" onClick={() => void refresh()} className="mt-6 h-11 rounded-full border-[#3A4254] bg-transparent px-5 text-[#F4F5F7] hover:bg-white/5 hover:text-white">
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Reintentar
            </Button>
          </section>
        ) : null}

        {isPollingDisconnected ? <div className="mb-6"><AnalysisPollingNotice /></div> : null}

        {catalog && hasPartialFailure ? (
          <section role="status" className="mb-7 flex items-start gap-3 border-y border-amber-500/25 bg-amber-500/[0.04] px-1 py-4 text-amber-100">
            <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Algunos estados no se pudieron verificar</p>
              <p className="mt-1 text-sm text-[#A3ABBA]">Conservamos los videos disponibles mientras vuelve la conexión.</p>
            </div>
          </section>
        ) : null}

        {catalog && items.length === 0 ? (
          <section className="flex min-h-[430px] flex-col items-center justify-center border-y border-[#252B38] py-16 text-center">
            <div className="mb-7 w-56 text-[#657089] opacity-60">
              <svg aria-hidden="true" viewBox="0 0 28 15"><BasketballCourtLines lengthM={28} widthM={15} /></svg>
            </div>
            <h2 className="scout-display text-4xl font-bold text-[#F4F5F7] sm:text-5xl">Tu primer video empieza acá</h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-[#A3ABBA]">Subí un video para preparar el archivo y obtener su análisis.</p>
            <Button asChild className="mt-7 h-[52px] rounded-full bg-[#FF6A1F] px-7 text-base font-semibold text-white hover:bg-[#ff7b38]">
              <Link to={videoUploadPath()}>Subir video<ArrowRight aria-hidden="true" className="h-5 w-5" /></Link>
            </Button>
          </section>
        ) : null}

        {catalog && priority ? (
          <>
            <PriorityMatch item={priority} posterUrl={posterUrls[priority.video.id]} />

            {recent.length > 0 ? (
              <section className="mt-14" aria-labelledby="recent-matches-title">
                <div className="flex items-end justify-between gap-4 border-b border-[#252B38] pb-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF6A1F]">Tu biblioteca</p>
                    <h2 id="recent-matches-title" className="scout-display mt-2 text-4xl font-bold text-[#F4F5F7]">Videos recientes</h2>
                  </div>
                  <Link to="/videos" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#A3ABBA] transition-colors hover:text-[#FF6A1F]">
                    Ver todos
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </div>
                <div>
                  {recent.map((item) => <RecentMatchRow key={item.video.id} item={item} posterUrl={posterUrls[item.video.id]} />)}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
