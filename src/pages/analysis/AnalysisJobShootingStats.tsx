import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CircleAlert, Info, LoaderCircle } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { analysisJobStatsService } from '@/services/registry'
import type {
  AnalysisJobShootingStats,
  AnalysisJobTeamSide,
  AnalysisJobTeamShootingStats,
  ProcessingJob,
  ShootingTotals,
} from '@/types'
import {
  analysisJobStatsLoadKey,
  loadAnalysisJobStats,
  type AnalysisJobStatsLoadContext,
} from './analysis-job-stats'
import { analysisJobTeamGroupLabel } from './analysis-job-team-side'
import {
  analysisJobPlayerKey,
  analysisJobPlayerLabelFromMap,
  buildAnalysisJobPlayerLabels,
  isAnalysisJobPlayerIdentified,
} from './analysis-job-player-identity'

interface AnalysisJobShootingStatsProps {
  job: ProcessingJob
}

type LoadState = 'blocked' | 'loading' | 'success' | 'error'

const ZONE_LABELS: Record<string, string> = {
  at_the_rim: 'Cerca del aro',
  paint: 'Pintura',
  mid_range: 'Media distancia',
  corner_three: 'Triple de esquina',
  above_the_break_three: 'Triple frontal',
}

const NOT_MEASURED_LABELS: Record<string, string> = {
  rebounds: 'rebotes',
  assists: 'asistencias',
  turnovers: 'pérdidas',
  steals: 'robos',
  fouls: 'faltas',
  minutes: 'minutos',
}

function formatPercentage(value: number | null): string {
  if (value == null) return '—'
  return `${(value * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`
}

function metricLine(made: number, attempted: number, percentage: number | null): string {
  return `${made}/${attempted} · ${formatPercentage(percentage)}`
}

function ShootingMetrics({ totals }: { totals: ShootingTotals }) {
  return (
    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      <div className="rounded-md bg-surface-subtle p-3">
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Puntos detectados</dt>
        <dd className="mt-1 text-2xl font-semibold text-foreground">{totals.points}</dd>
      </div>
      <div className="rounded-md bg-surface-subtle p-3">
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">TC</dt>
        <dd className="mt-1 font-semibold text-foreground">
          {metricLine(totals.fieldGoalsMade, totals.fieldGoalsAttempted, totals.fieldGoalPercentage)}
        </dd>
      </div>
      <div className="rounded-md bg-surface-subtle p-3">
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">2P</dt>
        <dd className="mt-1 font-semibold text-foreground">
          {metricLine(totals.twoPointMade, totals.twoPointAttempted, totals.twoPointPercentage)}
        </dd>
      </div>
      <div className="rounded-md bg-surface-subtle p-3">
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">3P</dt>
        <dd className="mt-1 font-semibold text-foreground">
          {metricLine(totals.threePointMade, totals.threePointAttempted, totals.threePointPercentage)}
        </dd>
      </div>
    </dl>
  )
}

function ZoneBreakdown({ totals }: { totals: ShootingTotals }) {
  const zones = Object.entries(totals.byZone)
  if (zones.length === 0) return null

  return (
    <div className="mt-4 border-t pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Por zona</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {zones.map(([zone, stats]) => (
          <span key={zone} className="rounded-md border bg-surface px-2.5 py-1.5 text-xs text-foreground">
            {ZONE_LABELS[zone] ?? zone}: {metricLine(stats.made, stats.attempted, stats.percentage)}
          </span>
        ))}
      </div>
    </div>
  )
}

function TeamStatsCard({
  team,
  ourTeamSide,
}: {
  team: AnalysisJobTeamShootingStats
  ourTeamSide: AnalysisJobTeamSide | null
}) {
  const isOurTeam = team.teamSide === ourTeamSide

  return (
    <article className="rounded-lg border bg-surface p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">{analysisJobTeamGroupLabel(team.teamSide)}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{team.playersTracked} jugadores detectados</p>
        </div>
        {isOurTeam && <Badge variant="analyzed">Tu equipo</Badge>}
      </div>
      <ShootingMetrics totals={team} />
      <ZoneBreakdown totals={team} />
    </article>
  )
}

function CoverageSummary({ stats }: { stats: AnalysisJobShootingStats }) {
  const { coverage } = stats
  const isPartial = coverage.shotsScored < coverage.shotsDetected
    || coverage.shotsWithoutCourtPosition > 0
    || coverage.shotsWithoutShooter > 0
    || coverage.playersWithJerseyNumber < coverage.playersTracked

  const notMeasured = coverage.notMeasured.map(
    (metric) => NOT_MEASURED_LABELS[metric] ?? metric,
  )

  return (
    <div className="mt-6 rounded-lg border bg-surface-subtle p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-foreground">Cobertura del análisis</p>
        {isPartial && <Badge variant="processing">Parcial</Badge>}
      </div>
      <dl className="mt-3 grid gap-2 text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
        <div><dt>Tiros detectados</dt><dd className="font-semibold text-foreground">{coverage.shotsDetected}</dd></div>
        <div><dt>Tiros contabilizados</dt><dd className="font-semibold text-foreground">{coverage.shotsScored}</dd></div>
        <div><dt>Camisetas identificadas</dt><dd className="font-semibold text-foreground">{coverage.playersWithJerseyNumber}/{coverage.playersTracked}</dd></div>
        <div><dt>Jugadores vinculados al plantel</dt><dd className="font-semibold text-foreground">{coverage.playersLinkedToRoster}/{coverage.playersTracked}</dd></div>
      </dl>
      {(coverage.shotsWithoutCourtPosition > 0 || coverage.shotsWithoutShooter > 0) && (
        <p className="mt-3 text-muted-foreground">
          {coverage.shotsWithoutCourtPosition} tiros sin posición válida y {coverage.shotsWithoutShooter} sin tirador identificado.
        </p>
      )}
      {notMeasured.length > 0 && (
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Este análisis mide tiros detectados. No mide {notMeasured.join(', ')}.
        </p>
      )}
    </div>
  )
}

export function AnalysisJobShootingStatsView({ job }: AnalysisJobShootingStatsProps) {
  const context = useMemo<AnalysisJobStatsLoadContext>(() => ({
    jobId: job.id,
    teamId: job.teamId,
    status: job.status,
    ourTeamSide: job.ourTeamSide,
  }), [job.id, job.ourTeamSide, job.status, job.teamId])
  const loadKey = analysisJobStatsLoadKey(context)
  const [loadState, setLoadState] = useState<LoadState>(loadKey ? 'loading' : 'blocked')
  const [stats, setStats] = useState<AnalysisJobShootingStats | null>(null)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    if (!loadKey) {
      setStats(null)
      setError('')
      setLoadState('blocked')
      return () => {
        active = false
      }
    }

    setStats(null)
    setError('')
    setLoadState('loading')
    void loadAnalysisJobStats(context, analysisJobStatsService).then(
      (loaded) => {
        if (!active || !loaded) return
        setStats(loaded)
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
      <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-labelledby="shooting-stats-title">
        <div className="flex items-start gap-3">
          <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <h2 id="shooting-stats-title" className="font-semibold text-foreground">Estadísticas de tiro detectadas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirmá primero qué grupo corresponde a tu equipo para asociar correctamente los jugadores con el plantel.
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
          Cargando estadísticas de tiro…
        </div>
      </section>
    )
  }

  if (loadState === 'error' || !stats) {
    return (
      <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-labelledby="shooting-stats-title">
        <h2 id="shooting-stats-title" className="font-semibold text-foreground">Estadísticas de tiro detectadas</h2>
        <Alert className="mt-4 flex flex-col gap-4 border-destructive/25 bg-destructive/5 sm:flex-row sm:items-center">
          <CircleAlert className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">No pudimos cargar las estadísticas</p>
            <p className="mt-1 text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
            Reintentar
          </Button>
        </Alert>
      </section>
    )
  }

  const orderedPlayers = stats.players.filter(isAnalysisJobPlayerIdentified).sort(
    (left, right) => Number(right.onCourt) - Number(left.onCourt),
  )
  const isEmpty = stats.teams.length === 0 && orderedPlayers.length === 0
  const playerLabels = buildAnalysisJobPlayerLabels(orderedPlayers)

  return (
    <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-labelledby="shooting-stats-title">
      <div>
        <h2 id="shooting-stats-title" className="font-semibold text-foreground">Estadísticas de tiro detectadas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Métricas estimadas por el sistema a partir de los tiros detectados; no reemplazan un box score oficial.
        </p>
      </div>

      {isEmpty ? (
        <EmptyState
          className="py-8"
          icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
          title="No se detectaron estadísticas"
          description="El análisis terminó, pero no produjo equipos ni jugadores con métricas de tiro para mostrar."
        />
      ) : (
        <>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {stats.teams.map((team) => (
              <TeamStatsCard key={team.teamSide} team={team} ourTeamSide={stats.ourTeamSide} />
            ))}
          </div>

          {orderedPlayers.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-foreground">Por jugador</h3>
              <div className="mt-3 overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Jugador</th>
                      <th className="px-4 py-3 font-medium">Grupo</th>
                      <th className="px-4 py-3 text-right font-medium">PTS</th>
                      <th className="px-4 py-3 text-right font-medium">TC</th>
                      <th className="px-4 py-3 text-right font-medium">2P</th>
                      <th className="px-4 py-3 text-right font-medium">3P</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orderedPlayers.map((player) => (
                      <tr key={analysisJobPlayerKey(player)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{analysisJobPlayerLabelFromMap(player, playerLabels)}</span>
                            {player.rosterName && <Badge variant="analyzed">Plantel</Badge>}
                          </div>
                          {player.jerseyNumber && (
                            <p className="mt-0.5 text-xs text-muted-foreground">Dorsal #{player.jerseyNumber}</p>
                          )}
                          {Object.keys(player.byZone).length > 0 && (
                            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                              Zonas: {Object.entries(player.byZone).map(([zone, zoneStats]) => (
                                `${ZONE_LABELS[zone] ?? zone} ${zoneStats.made}/${zoneStats.attempted}`
                              )).join(' · ')}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {player.teamSide == null ? '—' : analysisJobTeamGroupLabel(player.teamSide)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">{player.points}</td>
                        <td className="px-4 py-3 text-right text-foreground">{metricLine(player.fieldGoalsMade, player.fieldGoalsAttempted, player.fieldGoalPercentage)}</td>
                        <td className="px-4 py-3 text-right text-foreground">{metricLine(player.twoPointMade, player.twoPointAttempted, player.twoPointPercentage)}</td>
                        <td className="px-4 py-3 text-right text-foreground">{metricLine(player.threePointMade, player.threePointAttempted, player.threePointPercentage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <CoverageSummary stats={stats} />
    </section>
  )
}
