import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, LoaderCircle, MapPinned } from 'lucide-react'
import { ShotChartCourt } from '@/components/analysis/ShotChartCourt'
import { shotChartPointToPercent } from '@/components/analysis/shot-chart-court'
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
import { analysisJobShotChartService } from '@/services/registry'
import type { AnalysisJobShotChart, ProcessingJob } from '@/types'
import {
  analysisJobShotChartLoadKey,
  loadAnalysisJobShotChart,
  type AnalysisJobShotChartLoadContext,
} from './analysis-job-shot-chart'
import {
  analysisJobPlayerKey,
  analysisJobPlayerLabelFromMap,
  buildAnalysisJobPlayerLabels,
  isAnalysisJobPlayerIdentified,
} from './analysis-job-player-identity'

interface AnalysisJobShotChartProps {
  job: ProcessingJob
}

type LoadState = 'blocked' | 'loading' | 'success' | 'error'

function ShotChartCoverage({
  chart,
  invalidVisibleShots,
}: {
  chart: AnalysisJobShotChart
  invalidVisibleShots: number
}) {
  const partial = chart.coverage.shotsWithoutCourtPosition > 0
    || chart.coverage.shotsWithoutShooter > 0
    || invalidVisibleShots > 0

  return (
    <div className="mt-5 rounded-lg border bg-surface-subtle p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-foreground">Cobertura del mapa de tiros</p>
        {partial && <Badge variant="processing">Parcial</Badge>}
      </div>
      <dl className="mt-3 grid gap-2 text-muted-foreground sm:grid-cols-3">
        <div>
          <dt>Tiros en cancha</dt>
          <dd className="font-semibold text-foreground">{chart.coverage.shotsCharted}</dd>
        </div>
        <div>
          <dt>Sin posición válida</dt>
          <dd className="font-semibold text-foreground">{chart.coverage.shotsWithoutCourtPosition}</dd>
        </div>
        <div>
          <dt>Sin tirador identificado</dt>
          <dd className="font-semibold text-foreground">{chart.coverage.shotsWithoutShooter}</dd>
        </div>
      </dl>
      {invalidVisibleShots > 0 && (
        <p className="mt-3 text-muted-foreground">
          {invalidVisibleShots} marcadores fueron omitidos porque sus coordenadas quedan fuera de las dimensiones informadas por la cancha.
        </p>
      )}
    </div>
  )
}

export function AnalysisJobShotChartView({ job }: AnalysisJobShotChartProps) {
  const context = useMemo<AnalysisJobShotChartLoadContext>(() => ({
    jobId: job.id,
    teamId: job.teamId,
    status: job.status,
    ourTeamSide: job.ourTeamSide,
  }), [job.id, job.ourTeamSide, job.status, job.teamId])
  const loadKey = analysisJobShotChartLoadKey(context)
  const [loadState, setLoadState] = useState<LoadState>(loadKey ? 'loading' : 'blocked')
  const [chart, setChart] = useState<AnalysisJobShotChart | null>(null)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedPlayer, setSelectedPlayer] = useState('all')

  useEffect(() => {
    let active = true

    if (!loadKey) {
      setChart(null)
      setError('')
      setSelectedPlayer('all')
      setLoadState('blocked')
      return () => {
        active = false
      }
    }

    setChart(null)
    setError('')
    setSelectedPlayer('all')
    setLoadState('loading')
    void loadAnalysisJobShotChart(context, analysisJobShotChartService).then(
      (loaded) => {
        if (!active || !loaded) return
        setChart(loaded)
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

  if (job.status !== 'DONE') return null

  if (loadState === 'blocked') {
    return (
      <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-labelledby="shot-chart-title">
        <div className="flex items-start gap-3">
          <MapPinned className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <h2 id="shot-chart-title" className="font-semibold text-foreground">Mapa de tiros</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirmá primero qué grupo corresponde a tu equipo para asociar correctamente los jugadores.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (loadState === 'loading') {
    return (
      <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-busy="true" aria-live="polite">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          Cargando mapa de tiros…
        </div>
      </section>
    )
  }

  if (loadState === 'error' || !chart) {
    return (
      <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-labelledby="shot-chart-title">
        <h2 id="shot-chart-title" className="font-semibold text-foreground">Mapa de tiros</h2>
        <Alert className="mt-4 flex flex-col gap-4 border-destructive/25 bg-destructive/5 sm:flex-row sm:items-center">
          <CircleAlert className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">No pudimos cargar el mapa de tiros</p>
            <p className="mt-1 text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
            Reintentar
          </Button>
        </Alert>
      </section>
    )
  }

  const filteredShots = selectedPlayer === 'all'
    ? chart.shots
    : chart.shots.filter((shot) => analysisJobPlayerKey(shot) === selectedPlayer)
  const identifiedPlayers = chart.players.filter(isAnalysisJobPlayerIdentified)
  const playerLabels = buildAnalysisJobPlayerLabels(chart.players)
  const validShots = filteredShots.filter(
    (shot) => shotChartPointToPercent(chart.court, shot) != null,
  )
  const invalidVisibleShots = filteredShots.length - validShots.length

  return (
    <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-labelledby="shot-chart-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="shot-chart-title" className="font-semibold text-foreground">Mapa de tiros</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ubicación de los tiros proyectada sobre las dimensiones de cancha informadas por el sistema.
          </p>
        </div>
        {identifiedPlayers.length > 0 && (
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="w-full sm:w-56" aria-label="Filtrar tiros por jugador">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los jugadores</SelectItem>
              {identifiedPlayers.map((player) => (
                <SelectItem key={analysisJobPlayerKey(player)} value={analysisJobPlayerKey(player) as string}>
                  {analysisJobPlayerLabelFromMap(player, playerLabels)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {chart.shots.length === 0 ? (
        <EmptyState
          className="py-8"
          icon={<MapPinned className="h-5 w-5" aria-hidden="true" />}
          title="No hay tiros para ubicar"
          description="El análisis no devolvió tiros con posición válida para este mapa."
        />
      ) : validShots.length === 0 ? (
        <EmptyState
          className="py-8"
          icon={<MapPinned className="h-5 w-5" aria-hidden="true" />}
          title="No hay tiros visibles"
          description="Los tiros de esta selección no tienen coordenadas válidas dentro de la cancha informada."
        />
      ) : (
        <div className="mt-5">
          <ShotChartCourt court={chart.court} shots={validShots} players={chart.players} />
        </div>
      )}

      <ShotChartCoverage chart={chart} invalidVisibleShots={invalidVisibleShots} />
    </section>
  )
}
