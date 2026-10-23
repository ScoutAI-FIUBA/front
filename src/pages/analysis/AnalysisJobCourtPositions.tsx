import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleAlert, LoaderCircle, MapPinned, Users } from 'lucide-react'
import { CourtPositionsCourt } from '@/components/analysis/CourtPositionsCourt'
import { CourtPositionsHeatmap } from '@/components/analysis/CourtPositionsHeatmap'
import { CourtPositionsPlayback } from '@/components/analysis/CourtPositionsPlayback'
import { buildCourtPositionsHeatmap } from '@/components/analysis/court-positions-heatmap'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { analysisJobCourtPositionsService } from '@/services/registry'
import type {
  AnalysisJobCourtPositions,
  AnalysisJobCourtPositionsPlayer,
  ProcessingJob,
} from '@/types'
import {
  analysisJobCourtPositionsContextForJob,
  analysisJobCourtPositionsLoadKey,
  buildCourtPositionPlayerLabels,
  courtPositionSideLabel,
  defaultCourtPositionFilter,
  filterGroupedCourtPositionPlayers,
  filterIdentifiedCourtPositionPlayers,
  filterCourtPositionPlayers,
  isCourtPositionPlayerFilter,
  loadAnalysisJobCourtPositions,
  type CourtPositionsFilter,
} from './analysis-job-court-positions'
import {
  analysisJobPlayerKey,
  analysisJobPlayerLabelFromMap,
  type AnalysisJobPlayerIdentification,
  type AnalysisJobPlayerIdentity,
} from './analysis-job-player-identity'

interface AnalysisJobCourtPositionsProps {
  job: ProcessingJob
  playerIdentities?: Array<AnalysisJobPlayerIdentity & AnalysisJobPlayerIdentification & { rosterName?: string | null }>
  onTechnicalSummaryChange?: (summary: AnalysisMovementTechnicalSummary | null) => void
  presentation?: 'legacy' | 'match-report'
}

export interface AnalysisMovementTechnicalSummary {
  coverage: AnalysisJobCourtPositions['coverage']
  playerCount: number
}

type LoadState = 'idle' | 'loading' | 'success' | 'error'
type CourtPositionsView = 'trajectories' | 'heatmap'

function formatMetres(value: number): string {
  return `${value.toLocaleString('es-AR', { maximumFractionDigits: 2 })} m`
}

export function AnalysisJobCourtPositionsView({
  job,
  playerIdentities,
  onTechnicalSummaryChange,
  presentation = 'legacy',
}: AnalysisJobCourtPositionsProps) {
  const { id: jobId, status: jobStatus, teamId } = job
  const context = useMemo(
    () => analysisJobCourtPositionsContextForJob({ id: jobId, status: jobStatus, teamId }),
    [jobId, jobStatus, teamId],
  )
  const loadKey = analysisJobCourtPositionsLoadKey(context)
  const [loadState, setLoadState] = useState<LoadState>(loadKey ? 'loading' : 'idle')
  const [positions, setPositions] = useState<AnalysisJobCourtPositions | null>(null)
  const [filter, setFilter] = useState<CourtPositionsFilter>('all')
  const [view, setView] = useState<CourtPositionsView>('trajectories')
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const ourTeamSideRef = useRef(job.ourTeamSide)
  const playerIdentitiesRef = useRef(playerIdentities)

  useEffect(() => {
    ourTeamSideRef.current = job.ourTeamSide
  }, [job.ourTeamSide])

  useEffect(() => {
    playerIdentitiesRef.current = playerIdentities
  }, [playerIdentities])

  useEffect(() => {
    let active = true

    if (!loadKey) {
      setPositions(null)
      setFilter('all')
      setView('trajectories')
      setError('')
      setLoadState('idle')
      onTechnicalSummaryChange?.(null)
      return () => {
        active = false
      }
    }

    setPositions(null)
    setFilter('all')
    setView('trajectories')
    setError('')
    setLoadState('loading')
    void loadAnalysisJobCourtPositions(context, analysisJobCourtPositionsService).then(
      (loaded) => {
        if (!active || !loaded) return
        setPositions(loaded)
        setFilter(defaultCourtPositionFilter(loaded.players, ourTeamSideRef.current, playerIdentitiesRef.current))
        setLoadState('success')
        onTechnicalSummaryChange?.({
          coverage: loaded.coverage,
          playerCount: loaded.players.length,
        })
      },
      () => {
        if (!active) return
        setError('No pudimos cargar esta información. Reintentá en unos segundos.')
        setLoadState('error')
      },
    )

    return () => {
      active = false
    }
  }, [context, loadKey, onTechnicalSummaryChange, reloadKey])

  const groupedPlayers = useMemo(
    () => filterGroupedCourtPositionPlayers(positions?.players ?? [], job.ourTeamSide),
    [job.ourTeamSide, positions?.players],
  )
  const visiblePlayers = useMemo(
    () => filterCourtPositionPlayers(groupedPlayers, filter),
    [filter, groupedPlayers],
  )
  const identifiedPlayers = useMemo(
    () => filterIdentifiedCourtPositionPlayers(groupedPlayers, playerIdentities),
    [playerIdentities, groupedPlayers],
  )
  const visibleIdentifiedPlayers = useMemo(
    () => filterIdentifiedCourtPositionPlayers(visiblePlayers, playerIdentities),
    [playerIdentities, visiblePlayers],
  )
  useEffect(() => {
    if (!isCourtPositionPlayerFilter(filter)) return
    if (identifiedPlayers.some((player) => analysisJobPlayerKey(player) === filter)) return
    setFilter('all')
  }, [filter, identifiedPlayers])
  const heatmap = useMemo(
    () => positions
      ? buildCourtPositionsHeatmap(positions.court, visiblePlayers)
      : { cells: [], totalSamples: 0, maxSamplesPerCell: 0 },
    [positions, visiblePlayers],
  )
  const selectedPlayer = isCourtPositionPlayerFilter(filter) && visiblePlayers.length === 1
    ? visiblePlayers[0]
    : null
  const playerLabels = buildCourtPositionPlayerLabels(groupedPlayers, playerIdentities)

  if (jobStatus !== 'DONE') return null

  if (loadState === 'loading') {
    return (
      <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-busy="true" aria-live="polite">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          Cargando posiciones en cancha…
        </div>
      </section>
    )
  }

  if (loadState === 'error' || !positions) {
    return (
      <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-labelledby="court-positions-title">
        <h2 id="court-positions-title" className="font-semibold text-foreground">Posiciones en cancha</h2>
        <Alert className="mt-4 flex flex-col gap-4 border-destructive/25 bg-destructive/5 sm:flex-row sm:items-center">
          <CircleAlert className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">No pudimos cargar las posiciones</p>
            <p className="mt-1 text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
            Reintentar
          </Button>
        </Alert>
      </section>
    )
  }

  if (job.ourTeamSide == null) {
    return (
      <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-labelledby="court-positions-title">
        <h2 id="court-positions-title" className="font-semibold text-foreground">Movimiento</h2>
        <EmptyState
          className="mt-4 py-8"
          icon={<MapPinned className="h-5 w-5" aria-hidden="true" />}
          title="Elegí qué grupo es tu equipo en Resumen para ver sus jugadores y tiros"
          description="El movimiento se muestra sólo para el equipo analizado."
        />
      </section>
    )
  }

  if (groupedPlayers.length === 0) {
    return (
      <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-labelledby="court-positions-title">
        <h2 id="court-positions-title" className="font-semibold text-foreground">Posiciones en cancha</h2>
        <EmptyState
          className="mt-4 py-8"
          icon={<MapPinned className="h-5 w-5" aria-hidden="true" />}
          title="No se produjeron posiciones utilizables"
          description="El procesamiento terminó, pero no generó posiciones proyectadas que puedan mostrarse en la cancha."
        />
      </section>
    )
  }

  if (presentation === 'match-report') {
    return (
      <section className="min-w-0 space-y-4" aria-labelledby="court-positions-title">
        <header className="border-b border-[#252B38] pb-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(16rem,20rem)] lg:items-end lg:gap-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#788397]">Análisis espacial</p>
            <h2 id="court-positions-title" className="scout-display mt-1 text-4xl font-extrabold text-[#F4F5F7]">Movimiento</h2>
            <p className="mt-1 text-sm text-[#A3ABBA]">
              {view === 'trajectories'
                ? 'Recorrido ordenado de las posiciones detectadas en cancha.'
                : 'Frecuencia relativa de posiciones para la selección actual.'}
            </p>
          </div>
          <div className="flex shrink-0 gap-1" role="group" aria-label="Vista de movimiento">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(
                'rounded-full border px-5',
                view === 'trajectories'
                  ? 'border-[#FF6A1F] bg-[#FF6A1F] text-white hover:bg-[#ff7b38]'
                  : 'border-[#3A4254] bg-transparent text-[#A3ABBA] hover:border-[#FF6A1F] hover:bg-transparent hover:text-[#F4F5F7]',
              )}
              aria-pressed={view === 'trajectories'}
              onClick={() => setView('trajectories')}
            >
              Recorrido
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(
                'rounded-full border px-5',
                view === 'heatmap'
                  ? 'border-[#FF6A1F] bg-[#FF6A1F] text-white hover:bg-[#ff7b38]'
                  : 'border-[#3A4254] bg-transparent text-[#A3ABBA] hover:border-[#FF6A1F] hover:bg-transparent hover:text-[#F4F5F7]',
              )}
              aria-pressed={view === 'heatmap'}
              onClick={() => setView('heatmap')}
            >
              Mapa de calor
            </Button>
          </div>

          <div className="mt-4 w-full lg:mt-0">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#788397]" htmlFor="court-positions-filter">
              Jugador o grupo
            </label>
            <Select value={filter} onValueChange={(value) => setFilter(value as CourtPositionsFilter)}>
              <SelectTrigger id="court-positions-filter" className="w-full border-[#3A4254] bg-transparent text-[#F4F5F7]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {identifiedPlayers.map((player) => (
                  <SelectItem key={analysisJobPlayerKey(player)} value={analysisJobPlayerKey(player) as string}>
                    {analysisJobPlayerLabelFromMap(player, playerLabels)}
                  </SelectItem>
                ))}
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        {selectedPlayer ? (
          <dl className="grid border-y border-[#252B38] sm:grid-cols-2 lg:grid-cols-2 lg:divide-x lg:divide-[#252B38]">
            <div className="py-3 lg:pr-6">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#788397]">Jugador</dt>
              <dd className="mt-1 text-lg font-semibold text-[#F4F5F7]">{analysisJobPlayerLabelFromMap(selectedPlayer, playerLabels)}</dd>
              <dd className="mt-0.5 text-xs text-[#A3ABBA]">{courtPositionSideLabel(selectedPlayer.teamSide)}</dd>
            </div>
            <div className="py-3 lg:pl-6">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#788397]">Distancia aprox.</dt>
              <dd className="scout-display mt-1 text-3xl font-bold tabular-nums text-[#F4F5F7]">{formatMetres(selectedPlayer.movement.distanceM)}</dd>
            </div>
          </dl>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[#252B38] py-4">
            <div>
              <p className="font-semibold text-[#F4F5F7]">Vista comparativa</p>
              <p className="mt-1 text-xs text-[#A3ABBA]">Se superponen los recorridos completos de la selección.</p>
            </div>
            <span className="text-sm tabular-nums text-[#A3ABBA]">{visiblePlayers.length} jugadores</span>
          </div>
        )}

        <div className="min-w-0">
          {visiblePlayers.length === 0 ? (
            <div className="border-y border-[#252B38] py-10 text-center text-sm text-[#A3ABBA]">No hay jugadores que coincidan con esta selección.</div>
          ) : view === 'heatmap' ? (
            heatmap.totalSamples > 0
              ? <CourtPositionsHeatmap court={positions.court} heatmap={heatmap} presentation="match-report" />
              : <div className="border-y border-[#252B38] py-10 text-center text-sm text-[#A3ABBA]">No hay posiciones válidas para construir el mapa de calor.</div>
          ) : selectedPlayer ? (
            <CourtPositionsPlayback key={analysisJobPlayerKey(selectedPlayer)} court={positions.court} player={selectedPlayer} presentation="match-report" />
          ) : (
            <div className="space-y-3">
              <CourtPositionsCourt court={positions.court} players={visiblePlayers} ourTeamSide={job.ourTeamSide} presentation="match-report" />
              <p className="text-xs text-[#A3ABBA]">Elegí un jugador para reproducir su recorrido individual.</p>
            </div>
          )}
        </div>

        {!selectedPlayer && visibleIdentifiedPlayers.length > 0 ? (
          <div className="divide-y divide-[#252B38] border-y border-[#252B38]">
            {visibleIdentifiedPlayers.map((player: AnalysisJobCourtPositionsPlayer) => (
              <div key={analysisJobPlayerKey(player)} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 py-3 text-sm">
                <span className="font-medium text-[#F4F5F7]">{analysisJobPlayerLabelFromMap(player, playerLabels)}</span>
                <span className="tabular-nums text-[#A3ABBA]">aprox. {formatMetres(player.movement.distanceM)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    )
  }

  return (
    <section className="min-w-0 space-y-5" aria-labelledby="court-positions-title">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="court-positions-title" className="text-xl font-semibold text-foreground">Movimiento en cancha</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {view === 'trajectories'
              ? 'Seguí el recorrido espacial de un jugador o abrí una comparación secundaria.'
              : 'Observá dónde se concentran las posiciones del jugador o grupo seleccionado.'}
          </p>
        </div>
        <div className="flex shrink-0 gap-2" role="group" aria-label="Vista de movimiento">
          <Button type="button" size="sm" variant={view === 'trajectories' ? 'default' : 'ghost'} aria-pressed={view === 'trajectories'} onClick={() => setView('trajectories')}>
            Recorrido
          </Button>
          <Button type="button" size="sm" variant={view === 'heatmap' ? 'default' : 'ghost'} aria-pressed={view === 'heatmap'} onClick={() => setView('heatmap')}>
            Mapa de calor
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(240px,0.55fr)] sm:items-end">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="court-positions-filter">Jugador o comparación</label>
          <Select value={filter} onValueChange={(value) => setFilter(value as CourtPositionsFilter)}>
            <SelectTrigger id="court-positions-filter" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {identifiedPlayers.map((player) => (
                <SelectItem key={analysisJobPlayerKey(player)} value={analysisJobPlayerKey(player) as string}>
                  {analysisJobPlayerLabelFromMap(player, playerLabels)}
                </SelectItem>
              ))}
              <SelectItem value="all">Comparar todos los jugadores</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedPlayer ? (
          <dl className="border-l border-white/10 pl-4 text-sm">
            <div><dt className="text-xs text-muted-foreground">Distancia aprox.</dt><dd className="mt-1 font-semibold tabular-nums text-foreground">{formatMetres(selectedPlayer.movement.distanceM)}</dd></div>
          </dl>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" aria-hidden="true" /> Vista comparativa secundaria</p>
        )}
      </div>

      {selectedPlayer && (
        <div className="flex flex-wrap items-center gap-3 border-y border-white/10 py-3">
          <span className="flex h-10 min-w-10 items-center justify-center rounded-full border-2 border-primary bg-[#111827] px-2 font-bold text-white">
            {selectedPlayer.jerseyNumber ? `#${selectedPlayer.jerseyNumber}` : selectedPlayer.stablePlayerId ? 'J' : selectedPlayer.trackId}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{analysisJobPlayerLabelFromMap(selectedPlayer, playerLabels)}</p>
            <p className="text-xs text-muted-foreground">{courtPositionSideLabel(selectedPlayer.teamSide)}</p>
          </div>
          {job.ourTeamSide != null && selectedPlayer.teamSide === job.ourTeamSide && <Badge variant="analyzed">Tu equipo</Badge>}
        </div>
      )}

      <div className="min-w-0">
        {visiblePlayers.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">No hay jugadores que coincidan con esta selección.</div>
        ) : view === 'heatmap' ? (
          heatmap.totalSamples > 0
            ? <CourtPositionsHeatmap court={positions.court} heatmap={heatmap} />
            : <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">No hay posiciones válidas para construir el mapa de calor.</div>
        ) : selectedPlayer ? (
          <CourtPositionsPlayback key={analysisJobPlayerKey(selectedPlayer)} court={positions.court} player={selectedPlayer} />
        ) : (
          <div className="space-y-3">
            <CourtPositionsCourt court={positions.court} players={visiblePlayers} ourTeamSide={job.ourTeamSide} />
            <p className="text-xs text-muted-foreground">La comparación superpone recorridos completos. Elegí un jugador para reproducir una secuencia individual.</p>
          </div>
        )}
      </div>

      {!selectedPlayer && visibleIdentifiedPlayers.length > 0 && (
        <div className="divide-y divide-white/10 border-y border-white/10">
          {visibleIdentifiedPlayers.map((player: AnalysisJobCourtPositionsPlayer) => (
            <div key={analysisJobPlayerKey(player)} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3 text-sm">
              <span className="font-medium text-foreground">{analysisJobPlayerLabelFromMap(player, playerLabels)}</span>
              <span className="tabular-nums text-muted-foreground">aprox. {formatMetres(player.movement.distanceM)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
