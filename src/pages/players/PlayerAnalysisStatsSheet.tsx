import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ShotChartCourt } from '@/components/analysis/ShotChartCourt'
import { playerAnalysisService } from '@/services/registry'
import type {
  Player,
  PlayerAnalysisStats,
  PlayerAnalysisSummary,
  PlayerShootingLine,
  PlayerShotChart,
} from '@/types'
import {
  formatDistance,
  formatSecondsOnScreen,
  formatPct,
  formatRowSummary,
  hasAnalysisSummary,
  hasPlayerAnalysisStats,
  notMeasuredLabel,
  playerShotsToCourtShots,
  sortedZones,
  summaryFromStats,
  zoneLabel,
} from './player-analysis-stats'

interface PlayerAnalysisStatsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  player: Player | null
  onTotals?: (playerId: string, summary: PlayerAnalysisSummary) => void
}

type StatsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; stats: PlayerAnalysisStats; chart: PlayerShotChart | null; chartError: string | null }

const LOADING: StatsState = { status: 'loading' }
const ERROR_ALERT_CLASS = 'border-destructive/30 bg-red-50 text-destructive'

function errorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border bg-surface p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
    </div>
  )
}

function shootingCard(label: string, line: PlayerShootingLine) {
  return (
    <SummaryCard
      key={label}
      label={label}
      value={`${line.made}/${line.attempted}`}
      detail={formatPct(line.made, line.attempted)}
    />
  )
}

export function PlayerAnalysisStatsSheet({
  open,
  onOpenChange,
  player,
  onTotals,
}: PlayerAnalysisStatsSheetProps) {
  const [state, setState] = useState<StatsState>(LOADING)
  const [retry, setRetry] = useState(0)
  const playerId = player?.id ?? null
  const onTotalsRef = useRef(onTotals)
  useEffect(() => {
    onTotalsRef.current = onTotals
  })

  useEffect(() => {
    if (!open || !playerId) return
    let active = true
    setState(LOADING)
    void Promise.allSettled([
      playerAnalysisService.getStats(playerId),
      playerAnalysisService.getShotChart(playerId),
    ]).then(([statsResult, chartResult]) => {
      if (!active) return
      if (statsResult.status === 'rejected') {
        setState({
          status: 'error',
          message: errorMessage(statsResult.reason, 'No se pudieron cargar las estadísticas'),
        })
        return
      }
      onTotalsRef.current?.(playerId, summaryFromStats(statsResult.value))
      setState({
        status: 'ready',
        stats: statsResult.value,
        chart: chartResult.status === 'fulfilled' ? chartResult.value : null,
        chartError: chartResult.status === 'rejected'
          ? errorMessage(chartResult.reason, 'No se pudo cargar el gráfico de tiros')
          : null,
      })
    })
    return () => { active = false }
  }, [open, playerId, retry])

  const chart = state.status === 'ready' ? state.chart : null
  const courtShots = useMemo(() => (chart ? playerShotsToCourtShots(chart) : []), [chart])

  const fullName = player ? `${player.firstName} ${player.lastName}` : 'Jugador'
  const title = player?.jerseyNumber ? `${fullName} · #${player.jerseyNumber}` : fullName

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            Estadísticas medidas en los videos analizados. No son estadísticas oficiales del partido.
          </SheetDescription>
          <p
            className={`text-sm font-medium ${hasAnalysisSummary(player?.analysisSummary) ? '' : 'text-muted-foreground'}`}
          >
            {formatRowSummary(player?.analysisSummary)}
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          {state.status === 'loading' && (
            <div className="space-y-4" role="status" aria-label="Cargando estadísticas">
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-lg bg-surface-subtle" />
                ))}
              </div>
              <div className="h-40 animate-pulse rounded-lg bg-surface-subtle" />
              <div className="h-48 animate-pulse rounded-lg bg-surface-subtle" />
            </div>
          )}

          {state.status === 'error' && (
            <Alert className={ERROR_ALERT_CLASS}>
              <p className="font-medium">No pudimos cargar las estadísticas</p>
              <p className="mt-1">{state.message}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setRetry((value) => value + 1)}>
                Reintentar
              </Button>
            </Alert>
          )}

          {state.status === 'ready' && !hasPlayerAnalysisStats(state.stats) && (
            <EmptyState
              className="py-6 sm:py-8"
              title="Todavía no hay estadísticas"
              description="Aparece cuando el dorsal del jugador está confirmado en un video analizado con el lado propio marcado."
              icon={<BarChart3 className="h-5 w-5" />}
            />
          )}

          {state.status === 'ready' && hasPlayerAnalysisStats(state.stats) && (
            <div className="space-y-8">
              <section aria-label="Resumen" className="grid grid-cols-2 gap-3">
                <SummaryCard label="Videos analizados" value={String(state.stats.games)} />
                <SummaryCard label="Puntos" value={String(state.stats.points)} />
                {shootingCard('Tiros de campo', state.stats.fieldGoals)}
                {shootingCard('Dobles', state.stats.twoPoint)}
                {shootingCard('Triples', state.stats.threePoint)}
                <SummaryCard label="Tiros sin resultado" value={String(state.stats.unresolvedAttempts)} />
                <SummaryCard
                  label="Tiempo en pantalla"
                  value={formatSecondsOnScreen(state.stats.secondsOnScreen)}
                  detail="Tiempo visible en video"
                />
                <SummaryCard label="Distancia recorrida" value={formatDistance(state.stats.distanceM)} />
              </section>

              <section>
                <h3 className="text-sm font-semibold">Tiros por zona</h3>
                {sortedZones(state.stats.byZone).length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Sin tiros registrados por zona.</p>
                ) : (
                  <div className="mt-2 overflow-hidden rounded-lg border bg-surface">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          <th scope="col" className="px-3 py-2 font-semibold">Zona</th>
                          <th scope="col" className="px-3 py-2 text-right font-semibold">Convertidos/Intentos</th>
                          <th scope="col" className="px-3 py-2 text-right font-semibold">%</th>
                          <th scope="col" className="px-3 py-2 text-right font-semibold">Sin resultado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedZones(state.stats.byZone).map(([zone, line]) => (
                          <tr key={zone} className="border-b last:border-b-0">
                            <th scope="row" className="px-3 py-2 text-left font-medium">{zoneLabel(zone)}</th>
                            <td className="px-3 py-2 text-right">{line.made}/{line.attempted}</td>
                            <td className="px-3 py-2 text-right">{formatPct(line.made, line.attempted)}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">{line.unresolvedAttempts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold">Mapa de tiros</h3>
                {state.chartError && (
                  <Alert className={`mt-2 ${ERROR_ALERT_CLASS} px-3 py-2 text-xs`}>
                    No pudimos cargar el mapa de tiros. Las estadísticas siguen disponibles.
                  </Alert>
                )}
                {state.chart && (
                  <div className="mt-2 space-y-2">
                    <ShotChartCourt court={state.chart.court} shots={courtShots} players={[]} />
                    <p className="text-xs text-muted-foreground">
                      {state.chart.coverage.shotsCharted} tiros en {state.chart.coverage.videos} videos
                      {' · '}{state.chart.coverage.made} convertidos
                      {' · '}{state.chart.coverage.missed} fallados
                      {' · '}{state.chart.coverage.unresolved} sin resultado
                    </p>
                    <p className="text-xs text-muted-foreground">
                      La posición se proyecta desde la cámara; el lado de la cancha puede no coincidir con el aro atacado.
                    </p>
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold">Por video</h3>
                {state.stats.videos.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Sin videos para mostrar.</p>
                ) : (
                  <ul className="mt-2 divide-y rounded-lg border bg-surface">
                    {state.stats.videos.map((video) => (
                      <li key={`${video.jobId}-${video.videoId}`} className="px-3 py-2.5 text-sm">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="min-w-0 truncate font-medium">
                            {video.videoTitle ?? 'Video sin título'}
                            {video.jerseyNumber ? ` · #${video.jerseyNumber}` : ''}
                          </p>
                          <p className="shrink-0 font-semibold">{video.points} pts</p>
                        </div>
                        <p className="mt-0.5 text-xs">
                          TC {video.fieldGoals.made}/{video.fieldGoals.attempted}
                          {' · '}2P {video.twoPoint.made}/{video.twoPoint.attempted}
                          {' · '}3P {video.threePoint.made}/{video.threePoint.attempted}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          En pantalla {formatSecondsOnScreen(video.secondsOnScreen)}
                          {' · '}{formatDistance(video.distanceM)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {state.stats.notMeasured.length > 0 && (
                <p className="border-t pt-4 text-xs leading-5 text-muted-foreground">
                  No medido: {state.stats.notMeasured.map(notMeasuredLabel).join(', ')}.
                </p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
