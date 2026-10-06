import { useEffect, useState } from 'react'
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
import type {
  AnalysisJobShotChartShot,
  ProcessingJob,
} from '@/types'
import { cn } from '@/lib/utils'
import {
  analysisShotKey,
  DEFAULT_SHOT_EVIDENCE_FILTERS,
  filterAnalysisJobShots,
  formatShotTimestamp,
  shotHasVideoEvidence,
  type ShotEvidenceFilters,
} from './analysis-job-shot-evidence'
import {
  analysisJobPlayerKey,
  analysisJobPlayerLabelFromMap,
  buildAnalysisJobPlayerLabels,
  type AnalysisJobPlayerKey,
} from './analysis-job-player-identity'
import type { AnalysisJobShootingDataController } from './use-analysis-job-shooting-data'

interface AnalysisJobShotsWorkspaceProps {
  job: ProcessingJob
  shootingData: AnalysisJobShootingDataController
  onSeekToVideo: (seconds: number) => void
  onOpenOverview?: () => void
  presentation?: 'legacy' | 'match-report'
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

function shotPlayerLabel(
  shot: AnalysisJobShotChartShot,
  playerLabels: Map<AnalysisJobPlayerKey, string>,
): string {
  return analysisJobPlayerLabelFromMap(shot, playerLabels)
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
  playerLabels,
  presentation,
}: {
  shot: AnalysisJobShotChartShot | null
  onViewPlay: (shot: AnalysisJobShotChartShot) => void
  playerLabels: Map<AnalysisJobPlayerKey, string>
  presentation: 'legacy' | 'match-report'
}) {
  if (!shot) {
    return <p className="py-8 text-sm text-muted-foreground">No hay tiros que coincidan con los filtros actuales.</p>
  }

  const hasEvidence = shotHasVideoEvidence(shot)
  const reportPresentation = presentation === 'match-report'
  return (
    <aside className={cn(
      'min-w-0',
      reportPresentation
        ? 'border-y border-[#252B38] py-4'
        : 'border-t border-white/10 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0',
    )} aria-label="Tiro seleccionado">
      <p className={cn('text-xs font-medium', reportPresentation ? 'uppercase tracking-[0.16em] text-[#788397]' : 'text-muted-foreground')}>Tiro seleccionado</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cn('truncate font-semibold text-foreground', reportPresentation ? 'scout-display text-3xl font-bold' : 'text-lg')}>{shotPlayerLabel(shot, playerLabels)}</h3>
          {reportPresentation ? (
            <p className={cn(
              'mt-2 text-sm font-semibold',
              shot.result === 'made' ? 'text-emerald-300' : shot.result === 'missed' ? 'text-rose-300' : 'text-[#A3ABBA]',
            )}>{shotChartResultLabel(shot.result)}</p>
          ) : <p className="mt-1 text-sm text-muted-foreground">{ZONE_LABELS[shot.zone] ?? shot.zone}</p>}
        </div>
        {!reportPresentation ? (
          <Badge variant={shot.result === 'made' ? 'analyzed' : shot.result === 'missed' ? 'failed' : 'outline'}>
            {shotChartResultLabel(shot.result)}
          </Badge>
        ) : null}
      </div>

      <dl className={cn('mt-5 grid grid-cols-2 gap-y-4 border-y border-white/10 py-4', reportPresentation && 'gap-x-4 border-[#252B38]')}>
        <div><dt className="text-xs text-muted-foreground">Valor</dt><dd className={cn('mt-1 font-semibold tabular-nums text-foreground', reportPresentation ? 'text-base' : 'text-2xl')}>{shot.points}P</dd></div>
        <div><dt className="text-xs text-muted-foreground">Distancia</dt><dd className="mt-1 font-semibold tabular-nums text-foreground">{shot.distanceM.toLocaleString('es-AR', { maximumFractionDigits: 1 })} m</dd></div>
        {reportPresentation ? <div><dt className="text-xs text-muted-foreground">Zona</dt><dd className="mt-1 font-semibold text-foreground">{ZONE_LABELS[shot.zone] ?? shot.zone}</dd></div> : null}
        {reportPresentation && shot.shotType ? <div><dt className="text-xs text-muted-foreground">Tipo</dt><dd className="mt-1 font-semibold text-foreground">{shot.shotType}</dd></div> : null}
        <div className="col-span-2"><dt className="text-xs text-muted-foreground">Momento de video</dt><dd className="mt-1 font-semibold tabular-nums text-foreground">{hasEvidence ? formatShotTimestamp(shot.timestampSeconds as number) : 'No vinculado'}</dd></div>
      </dl>

      {hasEvidence ? (
        <Button type="button" className={cn('mt-4 w-full', reportPresentation && 'h-11 rounded-full bg-[#FF6A1F] text-white hover:bg-[#ff7b38]')} onClick={() => onViewPlay(shot)}>
          <Play className="h-4 w-4" aria-hidden="true" /> Ver jugada
        </Button>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">Este tiro puede inspeccionarse en la cancha, pero no tiene un momento de video informado.</p>
      )}
    </aside>
  )
}

function ShotMomentList({
  shots,
  activeShotKey,
  playerLabels,
  onSelectShot,
  presentation,
}: {
  shots: AnalysisJobShotChartShot[]
  activeShotKey: string | null
  playerLabels: Map<AnalysisJobPlayerKey, string>
  onSelectShot: (shot: AnalysisJobShotChartShot, index: number) => void
  presentation: 'legacy' | 'match-report'
}) {
  const reportPresentation = presentation === 'match-report'

  return (
    <div className={cn(
      'divide-y divide-white/10',
      reportPresentation ? 'divide-[#252B38] lg:max-h-[31rem] lg:overflow-y-auto lg:pr-1' : 'lg:max-h-64 lg:overflow-y-auto lg:pr-1',
    )}>
      {shots.map((shot, index) => {
        const key = analysisShotKey(shot, index)
        const selected = key === activeShotKey
        const hasEvidence = shotHasVideoEvidence(shot)
        return (
          <button
            key={key}
            type="button"
            className={cn(
              'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-left transition-colors motion-reduce:transition-none',
              reportPresentation ? 'relative py-3 pl-3 text-sm' : 'py-3',
              selected ? 'text-primary' : 'text-foreground hover:text-primary',
            )}
            aria-pressed={selected}
            onClick={() => onSelectShot(shot, index)}
          >
            {reportPresentation && selected ? <span className="absolute inset-y-2 left-0 w-0.5 bg-[#FF6A1F]" aria-hidden="true" /> : null}
            <span className="min-w-0">
              <span className="block truncate font-medium">{reportPresentation ? `Tiro ${index + 1} · ` : ''}{shotPlayerLabel(shot, playerLabels)}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{shot.points}P · {ZONE_LABELS[shot.zone] ?? shot.zone}</span>
            </span>
            <span className="text-right">
              <span className={cn(
                'block text-xs font-medium',
                shot.result === 'made' ? 'text-emerald-300' : shot.result === 'missed' ? 'text-rose-300' : 'text-[#A3ABBA]',
              )}>{shotChartResultLabel(shot.result)}</span>
              <span className="mt-1 inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                {hasEvidence && <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />}
                {hasEvidence ? formatShotTimestamp(shot.timestampSeconds as number) : 'Sin video'}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function AnalysisJobShotsWorkspace({
  job,
  shootingData,
  onSeekToVideo,
  onOpenOverview,
  presentation = 'legacy',
}: AnalysisJobShotsWorkspaceProps) {
  const {
    statsState,
    stats,
    retryStats,
    chartState,
    chart,
    retryChart,
  } = shootingData
  const [filters, setFilters] = useState<ShotEvidenceFilters>(DEFAULT_SHOT_EVIDENCE_FILTERS)
  const [selectedShotKey, setSelectedShotKey] = useState<string | null>(null)
  const [showMomentList, setShowMomentList] = useState(false)

  useEffect(() => {
    setFilters(DEFAULT_SHOT_EVIDENCE_FILTERS)
    setSelectedShotKey(null)
    setShowMomentList(false)
  }, [job.id, job.ourTeamSide])

  const reportPresentation = presentation === 'match-report'

  if (job.status !== 'DONE') return null

  if (job.ourTeamSide == null) {
    return (
      <section className={cn(reportPresentation ? 'border-y border-[#252B38] py-10 text-left' : 'rounded-xl border border-white/10 bg-surface p-6 text-center')}>
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
  const ourTeamHighPresence = stats?.players.filter((player) => (
    player.teamSide === stats.ourTeamSide && player.onCourt
  )).length ?? 0
  const zones = [...new Set(chart?.shots.map((shot) => shot.zone) ?? [])].sort()
  const statsPlayersByKey = new Map(
    (stats?.players ?? []).flatMap((player) => {
      const key = analysisJobPlayerKey(player)
      return key ? [[key, player] as const] : []
    }),
  )
  const chartPlayers = [...(chart?.players ?? [])].sort((left, right) => {
    const leftOnCourt = statsPlayersByKey.get(analysisJobPlayerKey(left) as AnalysisJobPlayerKey)?.onCourt ?? false
    const rightOnCourt = statsPlayersByKey.get(analysisJobPlayerKey(right) as AnalysisJobPlayerKey)?.onCourt ?? false
    return Number(rightOnCourt) - Number(leftOnCourt)
  })
  const playerLabels = buildAnalysisJobPlayerLabels(chartPlayers.map((player) => ({
    ...player,
    rosterName: statsPlayersByKey.get(analysisJobPlayerKey(player) as AnalysisJobPlayerKey)?.rosterName ?? null,
  })))
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
  }

  const viewShotPlay = (shot: AnalysisJobShotChartShot) => {
    const index = filteredShots.indexOf(shot)
    if (index >= 0) selectShot(shot, index)
    if (shotHasVideoEvidence(shot)) onSeekToVideo(shot.timestampSeconds as number)
  }

  return (
    <section className={cn(reportPresentation ? 'space-y-6' : 'space-y-4')} aria-labelledby="shots-workspace-title">
      {reportPresentation ? <h2 id="shots-workspace-title" className="sr-only">Tiros</h2> : (
        <div>
          <h2 id="shots-workspace-title" className="text-xl font-semibold text-foreground">Tiros y evidencia</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Elegí un lanzamiento en la cancha para revisar quién lo tomó, el resultado y su momento de video cuando esté disponible.</p>
        </div>
      )}

      {statsState === 'loading' && (
        <div className="flex min-h-24 items-center gap-3 rounded-xl bg-surface px-5 text-sm text-muted-foreground" aria-live="polite" aria-busy="true">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          Cargando métricas de tiro…
        </div>
      )}
      {statsState === 'error' && (
        <ModuleError title="No pudimos cargar las métricas de tiro" retry={retryStats} />
      )}
      {statsState === 'success' && ourTeam && (
        <dl className={cn(
          'grid grid-cols-2 border-y sm:divide-x',
          reportPresentation ? 'border-[#252B38] sm:grid-cols-3 sm:divide-[#252B38]' : 'border-white/10 sm:grid-cols-4 sm:divide-white/10',
        )}>
          {(reportPresentation ? [
            ['Tiros de campo', `${ourTeam.fieldGoalsMade}/${ourTeam.fieldGoalsAttempted}`],
            ['Efectividad', formatPercentage(ourTeam.fieldGoalPercentage)],
            ['Ubicados en cancha', chartState === 'success' && chart ? String(chart.coverage.shotsCharted) : '—'],
          ] : [
            ['Puntos detectados', String(ourTeam.points)],
            ['Tiros de campo', `${ourTeam.fieldGoalsMade}/${ourTeam.fieldGoalsAttempted}`],
            ['Efectividad TC', formatPercentage(ourTeam.fieldGoalPercentage)],
            [ourTeamHighPresence > 0 ? 'Mayor presencia observada' : 'Jugadores seguidos', String(ourTeamHighPresence || ourTeam.playersTracked)],
          ]).map(([label, value]) => (
            <div key={label} className={cn(reportPresentation ? 'px-1 py-4 sm:px-6 first:pl-0' : 'px-3 py-3 sm:px-4')}>
              <dd className={cn('tabular-nums text-foreground', reportPresentation ? 'scout-display text-5xl font-extrabold' : 'mt-1 text-2xl font-semibold')}>{value}</dd>
              <dt className={cn('text-muted-foreground', reportPresentation ? 'mt-1 text-xs' : 'text-[10px] font-semibold uppercase tracking-[0.12em]')}>{label}</dt>
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
        <ModuleError title="No pudimos cargar las ubicaciones de tiro" retry={retryChart} />
      )}

      {chartState === 'success' && chart && (
        <>
          <div className={cn('grid gap-2 border-y py-3 sm:grid-cols-2 lg:grid-cols-4', reportPresentation ? 'border-[#252B38]' : 'border-white/10')}>
            <Select value={filters.result} onValueChange={(value) => setFilters((current) => ({ ...current, result: value as ShotEvidenceFilters['result'] }))}>
              <SelectTrigger className={cn(reportPresentation && 'h-9 rounded-full border-[#3A4254] bg-transparent text-xs')} aria-label="Filtrar por resultado"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los resultados</SelectItem>
                <SelectItem value="made">Convertidos</SelectItem>
                <SelectItem value="missed">Fallados</SelectItem>
                <SelectItem value="unknown">Resultado desconocido</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.points} onValueChange={(value) => setFilters((current) => ({ ...current, points: value as ShotEvidenceFilters['points'] }))}>
              <SelectTrigger className={cn(reportPresentation && 'h-9 rounded-full border-[#3A4254] bg-transparent text-xs')} aria-label="Filtrar por valor"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">2P y 3P</SelectItem>
                <SelectItem value="2">Sólo 2P</SelectItem>
                <SelectItem value="3">Sólo 3P</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.player} onValueChange={(value) => setFilters((current) => ({ ...current, player: value as ShotEvidenceFilters['player'] }))}>
              <SelectTrigger className={cn(reportPresentation && 'h-9 rounded-full border-[#3A4254] bg-transparent text-xs')} aria-label="Filtrar por jugador"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los jugadores</SelectItem>
                {chartPlayers.map((player) => (
                  <SelectItem key={analysisJobPlayerKey(player)} value={analysisJobPlayerKey(player) as string}>
                    {analysisJobPlayerLabelFromMap(player, playerLabels)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.zone} onValueChange={(value) => setFilters((current) => ({ ...current, zone: value }))}>
              <SelectTrigger className={cn(reportPresentation && 'h-9 rounded-full border-[#3A4254] bg-transparent text-xs')} aria-label="Filtrar por zona"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las zonas</SelectItem>
                {zones.map((zone) => <SelectItem key={zone} value={zone}>{ZONE_LABELS[zone] ?? zone}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className={cn(
            'grid gap-5 lg:items-start',
            reportPresentation
              ? 'lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.62fr)]'
              : 'lg:grid-cols-[minmax(0,1.3fr)_minmax(250px,0.7fr)]',
          )}>
            <div className="min-w-0">
              <div className={cn('mb-3 flex items-center justify-between gap-3', reportPresentation && 'sr-only')}>
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
                  players={chartPlayers}
                  selectedShotKey={activeShotKey}
                  shotKey={analysisShotKey}
                  onSelectShot={selectShot}
                  presentation={presentation}
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

            <div className={cn(reportPresentation && 'min-w-0 space-y-3')}>
              <SelectedShotDetail shot={selectedShot} playerLabels={playerLabels} onViewPlay={viewShotPlay} presentation={presentation} />
              {reportPresentation ? (
                <ShotMomentList
                  shots={filteredShots}
                  activeShotKey={activeShotKey}
                  playerLabels={playerLabels}
                  onSelectShot={selectShot}
                  presentation={presentation}
                />
              ) : null}
            </div>
          </div>

          {!reportPresentation ? <div className="border-t border-white/10 pt-3">
            <button type="button" className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm font-medium text-foreground hover:text-primary" aria-expanded={showMomentList} onClick={() => setShowMomentList((current) => !current)}>
              <span>Explorar todos los momentos</span>
              <Badge variant="outline">{filteredShots.length}</Badge>
            </button>
            {showMomentList && (
              <ShotMomentList shots={filteredShots} activeShotKey={activeShotKey} playerLabels={playerLabels} onSelectShot={selectShot} presentation={presentation} />
            )}
          </div> : null}

          <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-3 text-xs text-muted-foreground', reportPresentation ? 'border-[#252B38]' : 'border-white/10')}>
            <span className="inline-flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />{chart.coverage.shotsCharted} tiros ubicados</span>
            <span>{chart.coverage.shotsWithoutCourtPosition} sin posición válida</span>
            <span>{chart.coverage.shotsWithoutShooter} sin tirador identificado</span>
          </div>
        </>
      )}
    </section>
  )
}
