import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  CircleAlert,
  Clock3,
  LoaderCircle,
  MapPinned,
  Play,
  Target,
} from 'lucide-react'
import { ShotChartCourt } from '@/components/analysis/ShotChartCourt'
import { shotChartPointToPercent, shotChartResultLabel } from '@/components/analysis/shot-chart-court'
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
import { analysisJobShotChartService, analysisJobStatsService } from '@/services/registry'
import type {
  AnalysisJobShotChart,
  AnalysisJobShotChartShot,
  AnalysisJobStatsCoverage,
  AnalysisJobTeamShootingStats,
  ProcessingJob,
} from '@/types'
import { cn } from '@/lib/utils'
import {
  analysisJobShotChartLoadKey,
  loadAnalysisJobShotChart,
  type AnalysisJobShotChartLoadContext,
} from './analysis-job-shot-chart'
import {
  analysisJobStatsLoadKey,
  loadAnalysisJobStats,
  type AnalysisJobStatsLoadContext,
} from './analysis-job-stats'
import {
  analysisShotKey,
  DEFAULT_SHOT_EVIDENCE_FILTERS,
  filterAnalysisJobShots,
  formatShotTimestamp,
  shotHasVideoEvidence,
  type ShotEvidenceFilters,
} from './analysis-job-shot-evidence'

type LoadState = 'blocked' | 'loading' | 'success' | 'error'

export interface AnalysisShootingSummary {
  team: AnalysisJobTeamShootingStats | null
  coverage: AnalysisJobStatsCoverage
}

interface AnalysisJobShotsWorkspaceProps {
  job: ProcessingJob
  onSeekToVideo: (seconds: number) => void
  onSummaryChange?: (summary: AnalysisShootingSummary | null) => void
  onOpenOverview?: () => void
}

const ZONE_LABELS: Record<string, string> = {
  at_the_rim: 'Cerca del aro',
  paint: 'Pintura',
  mid_range: 'Media distancia',
  corner_three: 'Triple de esquina',
  above_the_break_three: 'Triple frontal',
}

function formatPercentage(value: number | null): string {
  if (value == null) return '—'
  return `${(value * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`
}

function shotPlayerLabel(shot: AnalysisJobShotChartShot): string {
  if (shot.rosterName) return shot.rosterName
  if (shot.jerseyNumber) return `#${shot.jerseyNumber}`
  if (shot.trackId != null) return `Seguimiento ${shot.trackId}`
  return 'Tirador no identificado'
}

function ModuleError({ title, retry }: { title: string; retry: () => void }) {
  return (
    <Alert className="flex flex-col gap-4 border-destructive/25 bg-destructive/5 p-5 sm:flex-row sm:items-center">
      <CircleAlert className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">El resto del análisis sigue disponible.</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={retry}>Reintentar</Button>
    </Alert>
  )
}

function SelectedShotDetail({
  shot,
  onViewPlay,
}: {
  shot: AnalysisJobShotChartShot | null
  onViewPlay: (shot: AnalysisJobShotChartShot) => void
}) {
  if (!shot) {
    return <p className="py-8 text-sm text-muted-foreground">No hay tiros que coincidan con los filtros actuales.</p>
  }

  const hasEvidence = shotHasVideoEvidence(shot)
  return (
    <aside className="min-w-0 border-t border-white/10 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0" aria-label="Tiro seleccionado">
      <p className="text-xs font-medium text-muted-foreground">Tiro seleccionado</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-foreground">{shotPlayerLabel(shot)}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{ZONE_LABELS[shot.zone] ?? shot.zone}</p>
        </div>
        <Badge variant={shot.result === 'made' ? 'analyzed' : shot.result === 'missed' ? 'failed' : 'outline'}>
          {shotChartResultLabel(shot.result)}
        </Badge>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-y-4 border-y border-white/10 py-4">
        <div><dt className="text-xs text-muted-foreground">Valor</dt><dd className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{shot.points}P</dd></div>
        <div><dt className="text-xs text-muted-foreground">Distancia</dt><dd className="mt-1 font-semibold tabular-nums text-foreground">{shot.distanceM.toLocaleString('es-AR', { maximumFractionDigits: 1 })} m</dd></div>
        <div className="col-span-2"><dt className="text-xs text-muted-foreground">Momento de video</dt><dd className="mt-1 font-semibold tabular-nums text-foreground">{hasEvidence ? formatShotTimestamp(shot.timestampSeconds as number) : 'No vinculado'}</dd></div>
      </dl>

      {hasEvidence ? (
        <Button type="button" className="mt-4 w-full" onClick={() => onViewPlay(shot)}>
          <Play className="h-4 w-4" aria-hidden="true" /> Ver jugada
        </Button>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">Este tiro puede inspeccionarse en la cancha, pero no tiene un momento de video informado.</p>
      )}
    </aside>
  )
}

export function AnalysisJobShotsWorkspace({
  job,
  onSeekToVideo,
  onSummaryChange,
  onOpenOverview,
}: AnalysisJobShotsWorkspaceProps) {
  const statsContext = useMemo<AnalysisJobStatsLoadContext>(() => ({
    jobId: job.id,
    teamId: job.teamId,
    status: job.status,
    ourTeamSide: job.ourTeamSide,
  }), [job.id, job.ourTeamSide, job.status, job.teamId])
  const chartContext = useMemo<AnalysisJobShotChartLoadContext>(() => ({ ...statsContext }), [statsContext])
  const statsLoadKey = analysisJobStatsLoadKey(statsContext)
  const chartLoadKey = analysisJobShotChartLoadKey(chartContext)
  const [statsState, setStatsState] = useState<LoadState>(statsLoadKey ? 'loading' : 'blocked')
  const [chartState, setChartState] = useState<LoadState>(chartLoadKey ? 'loading' : 'blocked')
  const [stats, setStats] = useState<Awaited<ReturnType<typeof loadAnalysisJobStats>>>(null)
  const [chart, setChart] = useState<AnalysisJobShotChart | null>(null)
  const [statsRetry, setStatsRetry] = useState(0)
  const [chartRetry, setChartRetry] = useState(0)
  const [filters, setFilters] = useState<ShotEvidenceFilters>(DEFAULT_SHOT_EVIDENCE_FILTERS)
  const [selectedShotKey, setSelectedShotKey] = useState<string | null>(null)
  const [showMomentList, setShowMomentList] = useState(false)

  useEffect(() => {
    let active = true
    if (!statsLoadKey) {
      setStats(null)
      setStatsState('blocked')
      onSummaryChange?.(null)
      return () => { active = false }
    }

    setStatsState('loading')
    void loadAnalysisJobStats(statsContext, analysisJobStatsService).then(
      (loaded) => {
        if (!active || !loaded) return
        setStats(loaded)
        setStatsState('success')
        onSummaryChange?.({
          team: loaded.teams.find((team) => team.teamSide === loaded.ourTeamSide) ?? null,
          coverage: loaded.coverage,
        })
      },
      () => {
        if (!active) return
        setStatsState('error')
        onSummaryChange?.(null)
      },
    )
    return () => { active = false }
  }, [onSummaryChange, statsContext, statsLoadKey, statsRetry])

  useEffect(() => {
    let active = true
    if (!chartLoadKey) {
      setChart(null)
      setChartState('blocked')
      return () => { active = false }
    }

    setChartState('loading')
    void loadAnalysisJobShotChart(chartContext, analysisJobShotChartService).then(
      (loaded) => {
        if (!active || !loaded) return
        setChart(loaded)
        setChartState('success')
      },
      () => {
        if (active) setChartState('error')
      },
    )
    return () => { active = false }
  }, [chartContext, chartLoadKey, chartRetry])

  useEffect(() => {
    setFilters(DEFAULT_SHOT_EVIDENCE_FILTERS)
    setSelectedShotKey(null)
    setShowMomentList(false)
  }, [job.id, job.ourTeamSide])

  if (job.status !== 'DONE') return null

  if (job.ourTeamSide == null) {
    return (
      <section className="rounded-xl border border-white/10 bg-surface p-6 text-center">
        <Target className="mx-auto h-7 w-7 text-primary" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-semibold text-foreground">Primero identificá tu equipo</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          La confirmación persistida permite asociar correctamente jugadores, estadísticas y tiros.
        </p>
        {onOpenOverview && (
          <Button type="button" className="mt-5" onClick={onOpenOverview}>Ir a Resumen</Button>
        )}
      </section>
    )
  }

  const ourTeam = stats?.teams.find((team) => team.teamSide === stats.ourTeamSide) ?? null
  const zones = [...new Set(chart?.shots.map((shot) => shot.zone) ?? [])].sort()
  const filteredShots = chart ? filterAnalysisJobShots(chart.shots, filters) : []
  const validShots = chart
    ? filteredShots.filter((shot) => shotChartPointToPercent(chart.court, shot) != null)
    : []
  const invalidVisibleShots = filteredShots.length - validShots.length
  const selectedShot = filteredShots.find((shot, index) => analysisShotKey(shot, index) === selectedShotKey)
    ?? filteredShots[0]
    ?? null
  const activeShotKey = selectedShot
    ? analysisShotKey(selectedShot, filteredShots.indexOf(selectedShot))
    : null

  const selectShot = (shot: AnalysisJobShotChartShot, index: number) => {
    setSelectedShotKey(analysisShotKey(shot, index))
    if (shotHasVideoEvidence(shot)) onSeekToVideo(shot.timestampSeconds as number)
  }

  return (
    <section className="space-y-4" aria-labelledby="shots-workspace-title">
      <div>
        <h2 id="shots-workspace-title" className="text-xl font-semibold text-foreground">Tiros y evidencia</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Elegí un lanzamiento en la cancha para revisar quién lo tomó, el resultado y su momento de video cuando esté disponible.</p>
      </div>

      {statsState === 'loading' && (
        <div className="flex min-h-24 items-center gap-3 rounded-xl bg-surface px-5 text-sm text-muted-foreground" aria-live="polite" aria-busy="true">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          Cargando métricas de tiro…
        </div>
      )}
      {statsState === 'error' && (
        <ModuleError title="No pudimos cargar las métricas de tiro" retry={() => setStatsRetry((value) => value + 1)} />
      )}
      {statsState === 'success' && ourTeam && (
        <dl className="grid grid-cols-2 border-y border-white/10 sm:grid-cols-4 sm:divide-x sm:divide-white/10">
          {[
            ['Puntos detectados', String(ourTeam.points)],
            ['Tiros de campo', `${ourTeam.fieldGoalsMade}/${ourTeam.fieldGoalsAttempted}`],
            ['Efectividad TC', formatPercentage(ourTeam.fieldGoalPercentage)],
            ['Jugadores seguidos', String(ourTeam.playersTracked)],
          ].map(([label, value]) => (
            <div key={label} className="px-3 py-3 sm:px-4">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {chartState === 'loading' && (
        <div className="flex min-h-56 items-center justify-center gap-3 rounded-xl bg-surface text-sm text-muted-foreground" aria-live="polite" aria-busy="true">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          Cargando ubicaciones y momentos…
        </div>
      )}
      {chartState === 'error' && (
        <ModuleError title="No pudimos cargar las ubicaciones de tiro" retry={() => setChartRetry((value) => value + 1)} />
      )}

      {chartState === 'success' && chart && (
        <>
          <div className="grid gap-2 border-y border-white/10 py-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={filters.result} onValueChange={(value) => setFilters((current) => ({ ...current, result: value as ShotEvidenceFilters['result'] }))}>
              <SelectTrigger aria-label="Filtrar por resultado"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los resultados</SelectItem>
                <SelectItem value="made">Convertidos</SelectItem>
                <SelectItem value="missed">Fallados</SelectItem>
                <SelectItem value="unknown">Resultado desconocido</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.points} onValueChange={(value) => setFilters((current) => ({ ...current, points: value as ShotEvidenceFilters['points'] }))}>
              <SelectTrigger aria-label="Filtrar por valor"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">2P y 3P</SelectItem>
                <SelectItem value="2">Sólo 2P</SelectItem>
                <SelectItem value="3">Sólo 3P</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(filters.trackId)} onValueChange={(value) => setFilters((current) => ({ ...current, trackId: value === 'all' ? 'all' : Number(value) }))}>
              <SelectTrigger aria-label="Filtrar por jugador"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los jugadores</SelectItem>
                {chart.players.map((player) => (
                  <SelectItem key={player.trackId} value={String(player.trackId)}>{player.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.zone} onValueChange={(value) => setFilters((current) => ({ ...current, zone: value }))}>
              <SelectTrigger aria-label="Filtrar por zona"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las zonas</SelectItem>
                {zones.map((zone) => <SelectItem key={zone} value={zone}>{ZONE_LABELS[zone] ?? zone}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(250px,0.7fr)] lg:items-start">
            <div className="min-w-0">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">Mapa de tiros</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{filteredShots.length} tiros en la selección actual</p>
                </div>
                <MapPinned className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              {validShots.length > 0 ? (
                <ShotChartCourt
                  court={chart.court}
                  shots={validShots}
                  players={chart.players}
                  selectedShotKey={activeShotKey}
                  shotKey={analysisShotKey}
                  onSelectShot={selectShot}
                />
              ) : (
                <EmptyState
                  className="py-10"
                  icon={<MapPinned className="h-5 w-5" aria-hidden="true" />}
                  title="No hay tiros visibles"
                  description="La selección actual no contiene tiros con coordenadas válidas en cancha."
                />
              )}
              {invalidVisibleShots > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">{invalidVisibleShots} tiros de esta selección no tienen coordenadas válidas y no se dibujan.</p>
              )}
            </div>

            <SelectedShotDetail shot={selectedShot} onViewPlay={(shot) => selectShot(shot, filteredShots.indexOf(shot))} />
          </div>

          <div className="border-t border-white/10 pt-3">
            <button type="button" className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm font-medium text-foreground hover:text-primary" aria-expanded={showMomentList} onClick={() => setShowMomentList((current) => !current)}>
              <span>Explorar todos los momentos</span>
              <Badge variant="outline">{filteredShots.length}</Badge>
            </button>
            {showMomentList && (
              <div className="divide-y divide-white/10 lg:max-h-64 lg:overflow-y-auto lg:pr-1">
                {filteredShots.map((shot, index) => {
                  const key = analysisShotKey(shot, index)
                  const selected = key === activeShotKey
                  const hasEvidence = shotHasVideoEvidence(shot)
                  return (
                    <button key={key} type="button" className={cn('grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 text-left transition-colors motion-reduce:transition-none', selected ? 'text-primary' : 'text-foreground hover:text-primary')} aria-pressed={selected} onClick={() => selectShot(shot, index)}>
                      <span className="min-w-0"><span className="block truncate font-medium">{shotPlayerLabel(shot)}</span><span className="mt-0.5 block text-xs text-muted-foreground">{shot.points}P · {ZONE_LABELS[shot.zone] ?? shot.zone} · {shotChartResultLabel(shot.result)}</span></span>
                      <span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground">{hasEvidence && <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />}{hasEvidence ? formatShotTimestamp(shot.timestampSeconds as number) : 'Sin video'}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />{chart.coverage.shotsCharted} tiros ubicados</span>
            <span>{chart.coverage.shotsWithoutCourtPosition} sin posición válida</span>
            <span>{chart.coverage.shotsWithoutShooter} sin tirador identificado</span>
          </div>
        </>
      )}
    </section>
  )
}
