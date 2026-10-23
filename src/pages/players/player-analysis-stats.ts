import type {
  AnalysisJobShotChartShot,
  Player,
  PlayerAnalysisStats,
  PlayerAnalysisSummary,
  PlayerShotChart,
  PlayerZoneLine,
} from '../../types/index.ts'

const EMPTY = '—'

const ZONE_ORDER = [
  'at_the_rim',
  'paint',
  'mid_range',
  'corner_three',
  'above_the_break_three',
]

const ZONE_LABELS: Record<string, string> = {
  corner_three: 'Triple de esquina',
  above_the_break_three: 'Triple frontal',
  at_the_rim: 'Bajo el aro',
  paint: 'Pintura',
  mid_range: 'Media distancia',
  unknown: 'Sin zona',
}

const NOT_MEASURED_LABELS: Record<string, string> = {
  rebounds: 'rebotes',
  assists: 'asistencias',
  steals: 'robos',
  blocks: 'tapas',
  turnovers: 'pérdidas',
  free_throws: 'tiros libres',
  minutes: 'minutos jugados',
}

/** The only place a shooting percentage is computed: from made/attempted, never from a stored value. */
export function formatPct(made: number, attempted: number): string {
  if (!(attempted > 0) || !Number.isFinite(made)) return EMPTY
  return `${Math.round((100 * made) / attempted)}%`
}

export const NO_ANALYSIS_LABEL = 'Sin análisis'

export function hasAnalysisSummary(
  summary: PlayerAnalysisSummary | undefined,
): summary is PlayerAnalysisSummary {
  return summary !== undefined && summary.games > 0
}

/** "3 PJ · 24 pts · TC 9/20 (45%)", or "Sin análisis" when there is nothing to show. */
export function formatRowSummary(summary: PlayerAnalysisSummary | undefined): string {
  if (!hasAnalysisSummary(summary)) return NO_ANALYSIS_LABEL
  return `${summary.games} PJ · ${summary.points} pts · TC ${summary.fgMade}/${summary.fgAttempted} (${formatPct(summary.fgMade, summary.fgAttempted)})`
}

export function summaryFromStats(stats: PlayerAnalysisStats): PlayerAnalysisSummary {
  return {
    games: stats.games,
    points: stats.points,
    fgMade: stats.fieldGoals.made,
    fgAttempted: stats.fieldGoals.attempted,
  }
}

/** Replaces one player's summary; returns the same array when nothing changes. */
export function patchPlayerSummary(
  players: Player[],
  playerId: string,
  summary: PlayerAnalysisSummary,
): Player[] {
  const current = players.find((player) => player.id === playerId)
  if (!current) return players
  const old = current.analysisSummary
  if (
    old &&
    old.games === summary.games &&
    old.points === summary.points &&
    old.fgMade === summary.fgMade &&
    old.fgAttempted === summary.fgAttempted
  ) {
    return players
  }
  return players.map((player) =>
    player.id === playerId ? { ...player, analysisSummary: summary } : player,
  )
}

export function formatSecondsOnScreen(seconds: number | null): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return EMPTY
  const total = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

export function formatDistance(meters: number | null): string {
  if (meters === null || meters === undefined || Number.isNaN(meters)) return 'Sin medir'
  return `${Math.round(meters * 10) / 10} m`
}

export function zoneLabel(zone: string): string {
  return ZONE_LABELS[zone] ?? zone
}

export function notMeasuredLabel(key: string): string {
  return NOT_MEASURED_LABELS[key] ?? key
}

/** Known zones in a fixed order, then the remaining keys alphabetically. */
export function sortedZones(
  byZone: Record<string, PlayerZoneLine>,
): Array<[string, PlayerZoneLine]> {
  const keys = Object.keys(byZone)
  const known = ZONE_ORDER.filter((zone) => keys.includes(zone))
  const rest = keys.filter((zone) => !ZONE_ORDER.includes(zone)).sort()
  return [...known, ...rest].map((zone) => [zone, byZone[zone]])
}

/** Adapts player shots to the job shot chart court. distanceM is never rendered. */
export function playerShotsToCourtShots(
  chart: PlayerShotChart,
): AnalysisJobShotChartShot[] {
  const fullName = `${chart.player.firstName} ${chart.player.lastName}`.trim()
  return chart.shots.map((shot) => ({
    shotId: shot.shotKey,
    trackId: null,
    stablePlayerId: null,
    teamSide: null,
    jerseyNumber: chart.player.jerseyNumber,
    rosterPlayerId: chart.player.id,
    rosterName: fullName,
    xM: shot.xM,
    yM: shot.yM,
    made: shot.result === 'made',
    result: shot.result,
    points: shot.shotValue,
    zone: shot.zone ? zoneLabel(shot.zone) : EMPTY,
    distanceM: shot.distanceM ?? Number.NaN,
    shotType: shot.shotType,
    timestampSeconds: shot.timestampSeconds,
    attribution: null,
  }))
}

export function hasPlayerAnalysisStats(stats: PlayerAnalysisStats): boolean {
  return stats.games > 0
}
