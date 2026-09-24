import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, Info, LoaderCircle, MapPinned } from 'lucide-react'
import { CourtPositionsCourt } from '@/components/analysis/CourtPositionsCourt'
import { CourtPositionsHeatmap } from '@/components/analysis/CourtPositionsHeatmap'
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
  filterCourtPositionPlayers,
  loadAnalysisJobCourtPositions,
  type CourtPositionsFilter,
} from './analysis-job-court-positions'

interface AnalysisJobCourtPositionsProps {
  job: ProcessingJob
}

type LoadState = 'idle' | 'loading' | 'success' | 'error'
type CourtPositionsView = 'trajectories' | 'heatmap'

function formatMetres(value: number): string {
  return `${value.toLocaleString('es-AR', { maximumFractionDigits: 2 })} m`
}

function PlayerMovementCard({
  player,
  job,
}: {
  player: AnalysisJobCourtPositionsPlayer
  job: ProcessingJob
}) {
  const isOurTeam = job.ourTeamSide != null && player.teamSide === job.ourTeamSide

  return (
    <article className="rounded-lg border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-foreground">{courtPositionPlayerLabel(player)}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{courtPositionSideLabel(player.teamSide)}</p>
        </div>
        {isOurTeam && <Badge variant="analyzed">Tu equipo</Badge>}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Distancia</dt>
          <dd className="mt-1 font-semibold text-foreground">{formatMetres(player.movement.distanceM)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Muestras</dt>
          <dd className="mt-1 font-semibold text-foreground">{player.movement.samples}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-muted-foreground">Posición promedio</dt>
          <dd className="mt-1 font-medium text-foreground">
            x {formatMetres(player.movement.averagePosition.xM)} · y {formatMetres(player.movement.averagePosition.yM)}
          </dd>
        </div>
      </dl>
    </article>
  )
}

function CoverageNotices({ positions }: { positions: AnalysisJobCourtPositions }) {
  const { coverage } = positions
  if (!coverage.truncated && coverage.recordsOffCourt === 0) return null

  return (
    <div className="mt-5 space-y-3">
      {coverage.truncated && (
        <Alert className="flex items-start gap-3 border-information/25 bg-information/5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-information" aria-hidden="true" />
          <div>
            <p className="font-medium text-foreground">Cobertura parcial de posiciones</p>
            <p className="mt-1 text-sm text-muted-foreground">
              El sistema limitó la lectura de una trayectoria extensa. Las métricas de movimiento corresponden a los datos disponibles del análisis.
            </p>
          </div>
        </Alert>
      )}
      {coverage.recordsOffCourt > 0 && (
        <p className="text-xs text-muted-foreground">
          Se descartaron {coverage.recordsOffCourt} registros con proyecciones fuera de la cancha.
        </p>
      )}
    </div>
  )
}

export function AnalysisJobCourtPositionsView({ job }: AnalysisJobCourtPositionsProps) {
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

  useEffect(() => {
    let active = true

    if (!loadKey) {
      setPositions(null)
      setFilter('all')
      setView('trajectories')
      setError('')
      setLoadState('idle')
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
        setLoadState('success')
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
  }, [context, loadKey, reloadKey])

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
        <CoverageNotices positions={positions} />
      </section>
    )
  }

  return (
    <section className="min-w-0 rounded-lg border bg-surface p-4 sm:p-6" aria-labelledby="court-positions-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="court-positions-title" className="font-semibold text-foreground">Posiciones en cancha</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {view === 'trajectories'
              ? 'Trayectorias proyectadas por el sistema. La distancia y la posición promedio usan la trayectoria completa analizada.'
              : 'Concentración relativa de las muestras espaciales disponibles en el análisis de posiciones.'}
          </p>
        </div>
        <div className="grid w-full gap-3 sm:w-72">
          <div>
            <p id="court-positions-view-label" className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Vista
            </p>
            <div className="flex gap-2" role="group" aria-labelledby="court-positions-view-label">
              <Button
                type="button"
                size="sm"
                variant={view === 'trajectories' ? 'default' : 'outline'}
                className="flex-1"
                aria-pressed={view === 'trajectories'}
                onClick={() => setView('trajectories')}
              >
                Trayectorias
              </Button>
              <Button
                type="button"
                size="sm"
                variant={view === 'heatmap' ? 'default' : 'outline'}
                className="flex-1"
                aria-pressed={view === 'heatmap'}
                onClick={() => setView('heatmap')}
              >
                Mapa de calor
              </Button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="court-positions-filter">
              Mostrar
            </label>
            <Select value={filter} onValueChange={(value) => setFilter(value as CourtPositionsFilter)}>
              <SelectTrigger id="court-positions-filter" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los seguimientos</SelectItem>
                <SelectItem value="side-0">Grupo detectado A</SelectItem>
                <SelectItem value="side-1">Grupo detectado B</SelectItem>
                <SelectItem value="unassigned">Sin grupo</SelectItem>
                {positions.players.map((player) => (
                  <SelectItem key={player.trackId} value={`track:${player.trackId}`}>
                    {courtPositionPlayerLabel(player)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mt-5 min-w-0">
        {visiblePlayers.length > 0 ? (
          view === 'trajectories' ? (
            <CourtPositionsCourt
              court={positions.court}
              players={visiblePlayers}
              ourTeamSide={job.ourTeamSide}
            />
          ) : heatmap.totalSamples > 0 ? (
            <CourtPositionsHeatmap court={positions.court} heatmap={heatmap} />
          ) : (
            <div className="rounded-lg border border-dashed bg-surface-subtle px-4 py-8 text-center text-sm text-muted-foreground">
              No hay posiciones válidas para construir el mapa de calor.
            </div>
          )
        ) : (
          <div className="rounded-lg border border-dashed bg-surface-subtle px-4 py-8 text-center text-sm text-muted-foreground">
            No hay seguimientos que coincidan con este filtro.
          </div>
        )}
      </div>

      {visiblePlayers.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visiblePlayers.map((player) => (
            <PlayerMovementCard key={player.trackId} player={player} job={job} />
          ))}
        </div>
      )}

      <CoverageNotices positions={positions} />
    </section>
  )
}
