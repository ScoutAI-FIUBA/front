import { useMemo, useState } from 'react'
import { ArrowRight, CircleAlert, LoaderCircle, RefreshCw, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BasketballCourtLines } from '@/components/analysis/BasketballCourtLines'
import { AnalysisPollingNotice } from '@/components/analysis/AnalysisPollingNotice'
import { Button } from '@/components/ui/button'
import { useAnalysisJobCatalog } from '@/pages/analysis/use-analysis-job-catalog'
import { videoUploadPath } from '@/pages/videos/video-upload-navigation'
import {
  buildMatchLibrary,
  filterMatchLibrary,
  matchLibraryDisplayLabel,
  matchLibraryDisplayState,
  type MatchLibraryDisplayState,
  type MatchLibraryFilter,
  type MatchLibraryItem,
} from './match-library'

const FILTERS: Array<{ value: MatchLibraryFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'En proceso' },
  { value: 'done', label: 'Listos' },
  { value: 'failed', label: 'Con error' },
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

function matchStateTone(state: MatchLibraryDisplayState): string {
  if (state === 'report-ready') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  if (state === 'analysis-error') return 'border-red-500/30 bg-red-500/10 text-red-300'
  if (state === 'queued' || state === 'analyzing') {
    return 'border-[#FF6A1F]/40 bg-[#FF6A1F]/10 text-[#FF9A68]'
  }
  if (state === 'preparing-file') return 'border-amber-500/30 bg-amber-500/10 text-amber-200'
  return 'border-white/10 bg-white/[0.04] text-[#A3ABBA]'
}

function unavailableActionCopy(item: MatchLibraryItem): string {
  if (item.analysisState === 'unknown') return 'No se pudo verificar el análisis'
  if (item.materialState === 'failed') return 'El archivo no está disponible'
  return 'Disponible cuando el archivo esté listo'
}

function MatchCard({ item }: { item: MatchLibraryItem }) {
  const titleId = `match-${item.video.id}-title`
  const displayState = matchLibraryDisplayState(item)

  return (
    <article
      aria-labelledby={titleId}
      className="group flex min-h-[440px] flex-col overflow-hidden rounded-[22px] border border-[#252B38] bg-[#151922] transition-colors hover:border-[#3A4254]"
    >
      <div className="relative h-44 overflow-hidden border-b border-[#252B38] bg-[#11151D] px-6 py-5">
        <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full border border-[#FF6A1F]/15" />
        <svg
          aria-hidden="true"
          className="relative h-full w-full opacity-55"
          viewBox="0 0 28 15"
          preserveAspectRatio="xMidYMid meet"
        >
          <BasketballCourtLines lengthM={28} widthM={15} />
        </svg>
        <span
          className={`absolute left-5 top-5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${matchStateTone(displayState)}`}
        >
          {matchLibraryDisplayLabel(displayState)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#A3ABBA]">
          {item.team?.name ?? 'Equipo no disponible'}
        </p>
        <h2
          id={titleId}
          className="scout-display text-balance text-[32px] font-extrabold text-[#F4F5F7]"
        >
          {item.video.title || 'Video sin título'}
        </h2>
        <p className="mt-3 text-sm text-[#A3ABBA]">
          Fecha de carga · {formatUploadDate(item.video.uploadedAt)}
        </p>

        <div className="mt-auto pt-6">
          {item.action ? (
            <Button
              asChild
              variant="outline"
              className="h-[52px] w-full rounded-full border-[#3A4254] bg-transparent px-6 text-base font-semibold text-[#F4F5F7] shadow-none hover:border-[#FF6A1F] hover:bg-[#FF6A1F] hover:text-white"
            >
              <Link to={item.action.to}>
                {item.action.label}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <div className="flex min-h-[52px] items-center justify-center rounded-full border border-[#3A4254] px-5 text-center text-sm font-medium text-[#A3ABBA]">
              {unavailableActionCopy(item)}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function MatchesLoading() {
  return (
    <div aria-label="Cargando partidos" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-[440px] animate-pulse rounded-[22px] border border-[#252B38] bg-[#151922] motion-reduce:animate-none"
        />
      ))}
    </div>
  )
}

export function MatchesPage() {
  const { catalog, loadState, isRefreshing, isPollingDisconnected, refresh } =
    useAnalysisJobCatalog()
  const [filter, setFilter] = useState<MatchLibraryFilter>('all')

  const items = useMemo(() => (catalog ? buildMatchLibrary(catalog) : []), [catalog])
  const filteredItems = useMemo(() => filterMatchLibrary(items, filter), [filter, items])
  const uploadPath = videoUploadPath({ returnTo: '/partidos' })
  const hasPartialFailure =
    catalog?.partialFailures.some((failure) => failure.scope !== 'active-job') ?? false

  return (
    <div className="pb-16 pt-4 sm:pt-8">
      <header className="flex flex-col gap-7 border-b border-[#252B38] pb-9 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#FF6A1F]">
            Biblioteca
          </p>
          <h1 className="scout-display text-[clamp(3.7rem,9vw,5.4rem)] font-extrabold text-[#F4F5F7]">
            Partidos
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[#A3ABBA] sm:text-lg">
            Subí tus partidos, seguí el análisis y encontrá cada jugada.
          </p>
        </div>
        <Button
          asChild
          className="h-[54px] shrink-0 rounded-full bg-[#FF6A1F] px-7 text-base font-semibold text-white shadow-none hover:bg-[#ff7b38]"
        >
          <Link to={uploadPath}>
            <Upload aria-hidden="true" className="h-5 w-5" />
            Subir partido
          </Link>
        </Button>
      </header>

      <div
        className="flex flex-nowrap items-center gap-2 overflow-x-auto py-7 sm:flex-wrap sm:overflow-visible"
        aria-label="Filtrar partidos"
      >
        {FILTERS.map((option) => {
          const selected = filter === option.value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilter(option.value)}
              className={`min-h-11 shrink-0 rounded-full border px-5 text-sm font-semibold transition-colors ${
                selected
                  ? 'border-[#F4F5F7] bg-[#F4F5F7] text-[#0B0D12]'
                  : 'border-[#3A4254] bg-transparent text-[#A3ABBA] hover:border-[#A3ABBA] hover:text-[#F4F5F7]'
              }`}
            >
              {option.label}
            </button>
          )
        })}
        {isRefreshing ? (
          <span className="ml-auto inline-flex shrink-0 items-center gap-2 text-sm text-[#A3ABBA]">
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            Actualizando
          </span>
        ) : null}
      </div>

      {loadState === 'loading' ? <MatchesLoading /> : null}

      {loadState === 'error' ? (
        <section
          role="alert"
          className="flex flex-col items-start gap-5 rounded-[22px] border border-red-500/30 bg-red-500/[0.06] p-7 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-red-300">
              <CircleAlert aria-hidden="true" className="h-5 w-5" />
              <h2 className="font-semibold">No pudimos cargar tus partidos</h2>
            </div>
            <p className="mt-2 text-sm text-[#A3ABBA]">
              Revisá tu conexión e intentá nuevamente.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void refresh()}
            className="h-11 rounded-full border-[#3A4254] bg-transparent px-5 text-[#F4F5F7] hover:bg-white/5 hover:text-white"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Reintentar
          </Button>
        </section>
      ) : null}

      {loadState === 'session-expired' ? (
        <section role="alert" className="rounded-[22px] border border-[#3A4254] bg-[#151922] p-7">
          <h2 className="font-semibold text-[#F4F5F7]">Tu sesión terminó</h2>
          <p className="mt-2 text-sm text-[#A3ABBA]">
            Volvé a iniciar sesión para cargar tus partidos.
          </p>
        </section>
      ) : null}

      {loadState === 'success' ? (
        <>
          {hasPartialFailure ? (
            <section
              role="status"
              className="mb-6 flex flex-col gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm text-amber-100">
                Algunos estados no se pudieron verificar. Conservamos la información disponible.
              </p>
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex min-h-10 items-center gap-2 self-start rounded-full border border-amber-400/30 px-4 text-sm font-semibold text-amber-100 sm:self-auto"
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                Reintentar
              </button>
            </section>
          ) : null}

          {isPollingDisconnected ? (
            <div className="mb-6">
              <AnalysisPollingNotice />
            </div>
          ) : null}

          {items.length === 0 ? (
            <section className="flex min-h-[360px] flex-col items-center justify-center border-y border-[#252B38] py-16 text-center">
              <div className="mb-6 w-52 text-[#A3ABBA] opacity-55">
                <svg aria-hidden="true" viewBox="0 0 28 15">
                  <BasketballCourtLines lengthM={28} widthM={15} />
                </svg>
              </div>
              <h2 className="scout-display text-4xl font-bold text-[#F4F5F7]">
                Tu primer partido empieza acá
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-[#A3ABBA]">
                Subí tu primer partido para obtener tiros, evidencia, movimiento y comparaciones.
              </p>
              <Button
                asChild
                className="mt-7 h-[52px] rounded-full bg-[#FF6A1F] px-7 text-base font-semibold text-white hover:bg-[#ff7b38]"
              >
                <Link to={uploadPath}>Subir partido</Link>
              </Button>
            </section>
          ) : filteredItems.length === 0 ? (
            <section className="border-y border-[#252B38] py-16 text-center">
              <h2 className="scout-display text-3xl font-bold text-[#F4F5F7]">
                No hay partidos en este estado
              </h2>
              <p className="mt-3 text-[#A3ABBA]">Probá con otro filtro para ver tu biblioteca.</p>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="mt-6 min-h-11 rounded-full border border-[#3A4254] px-5 text-sm font-semibold text-[#F4F5F7] hover:bg-white/5"
              >
                Ver todos
              </button>
            </section>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <MatchCard key={item.video.id} item={item} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

export default MatchesPage
