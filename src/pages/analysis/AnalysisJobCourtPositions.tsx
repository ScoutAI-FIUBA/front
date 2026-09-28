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
  courtPositionPlayerLabel,
  courtPositionSideLabel,
  defaultCourtPositionFilter,
  filterCourtPositionPlayers,
  loadAnalysisJobCourtPositions,
  type CourtPositionsFilter,
} from './analysis-job-court-positions'

interface AnalysisJobCourtPositionsProps {
  job: ProcessingJob
  onTechnicalSummaryChange?: (summary: AnalysisMovementTechnicalSummary | null) => void
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

export function AnalysisJobCourtPositionsView({ job, onTechnicalSummaryChange }: AnalysisJobCourtPositionsProps) {
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

  useEffect(() => {
    ourTeamSideRef.current = job.ourTeamSide
  }, [job.ourTeamSide])

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
        setFilter(defaultCourtPositionFilter(loaded.players, ourTeamSideRef.current))
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

  const visiblePlayers = useMemo(
    () => filterCourtPositionPlayers(positions?.players ?? [], filter),
    [filter, positions?.players],
  )
  const heatmap = useMemo(
    () => positions
      ? buildCourtPositionsHeatmap(positions.court, visiblePlayers)
      : { cells: [], totalSamples: 0, maxSamplesPerCell: 0 },
    [positions, visiblePlayers],
  )
  const selectedPlayer = filter.startsWith('track:') && visiblePlayers.length === 1
    ? visiblePlayers[0]
    : null

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

  if (positions.players.length === 0) {
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

  return (
    <section className="min-w-0 space-y-5" aria-labelledby="court-positions-title">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="court-positions-title" className="text-xl font-semibold text-foreground">Movimiento en cancha</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {view === 'trajectories'
              ? 'Seguí el recorrido espacial de un jugador o abrí una comparación secundaria.'
              : 'Observá dónde se concentran las muestras del jugador o grupo seleccionado.'}
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
              {positions.players.map((player) => (
                <SelectItem key={player.trackId} value={`track:${player.trackId}`}>{courtPositionPlayerLabel(player)}</SelectItem>
              ))}
              <SelectItem value="all">Comparar todos los seguimientos</SelectItem>
              <SelectItem value="side-0">Comparar grupo A</SelectItem>
              <SelectItem value="side-1">Comparar grupo B</SelectItem>
              <SelectItem value="unassigned">Comparar sin grupo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedPlayer ? (
          <dl className="grid grid-cols-2 gap-x-6 border-l border-white/10 pl-4 text-sm">
            <div><dt className="text-xs text-muted-foreground">Distancia detectada</dt><dd className="mt-1 font-semibold tabular-nums text-foreground">{formatMetres(selectedPlayer.movement.distanceM)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Muestras</dt><dd className="mt-1 font-semibold tabular-nums text-foreground">{selectedPlayer.movement.samples}</dd></div>
          </dl>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" aria-hidden="true" /> Vista comparativa secundaria</p>
        )}
      </div>

      {selectedPlayer && (
        <div className="flex flex-wrap items-center gap-3 border-y border-white/10 py-3">
          <span className="flex h-10 min-w-10 items-center justify-center rounded-full border-2 border-primary bg-[#111827] px-2 font-bold text-white">
            {selectedPlayer.jerseyNumber ? `#${selectedPlayer.jerseyNumber}` : selectedPlayer.trackId}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{courtPositionPlayerLabel(selectedPlayer)}</p>
            <p className="text-xs text-muted-foreground">{courtPositionSideLabel(selectedPlayer.teamSide)}</p>
          </div>
          {job.ourTeamSide != null && selectedPlayer.teamSide === job.ourTeamSide && <Badge variant="analyzed">Tu equipo</Badge>}
        </div>
      )}

      <div className="min-w-0">
        {visiblePlayers.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">No hay seguimientos que coincidan con esta selección.</div>
        ) : view === 'heatmap' ? (
          heatmap.totalSamples > 0
            ? <CourtPositionsHeatmap court={positions.court} heatmap={heatmap} />
            : <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">No hay posiciones válidas para construir el mapa de calor.</div>
        ) : selectedPlayer ? (
          <CourtPositionsPlayback key={selectedPlayer.trackId} court={positions.court} player={selectedPlayer} />
        ) : (
          <div className="space-y-3">
            <CourtPositionsCourt court={positions.court} players={visiblePlayers} ourTeamSide={job.ourTeamSide} />
            <p className="text-xs text-muted-foreground">La comparación superpone recorridos completos. Elegí un jugador para reproducir una secuencia individual.</p>
          </div>
        )}
      </div>

      {!selectedPlayer && visiblePlayers.length > 0 && (
        <div className="divide-y divide-white/10 border-y border-white/10">
          {visiblePlayers.map((player: AnalysisJobCourtPositionsPlayer) => (
            <div key={player.trackId} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 py-3 text-sm">
              <span className="font-medium text-foreground">{courtPositionPlayerLabel(player)}</span>
              <span className="tabular-nums text-muted-foreground">{formatMetres(player.movement.distanceM)}</span>
              <span className="tabular-nums text-muted-foreground">{player.movement.samples} muestras</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
