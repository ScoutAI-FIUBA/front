import type {
  AnalysisJobPlayerShootingStats,
  AnalysisJobShotChartPlayer,
  AnalysisJobShotChartShot,
  AnalysisJobShotStat,
  AnalysisJobTeamSide,
} from '../../types/index.ts'
import {
  analysisJobPlayerKey,
  analysisJobPlayerLabelFromMap,
  buildAnalysisJobPlayerLabels,
  hasAnalysisJobTeamSide,
  isAnalysisJobPlayerIdentified,
  type AnalysisJobPlayerKey,
} from './analysis-job-player-identity.ts'
import { analysisJobTeamGroupLabel } from './analysis-job-team-side.ts'

export interface AnalysisJobPlayerShootingRow {
  key: AnalysisJobPlayerKey
  label: string
  groupLabel: string
  points: number
  fieldGoals: string
  twoPoint: string
  threePoint: string
  zones: Array<{
    key: string
    made: number
    attempted: number
    percentage: number | null
  }>
  jerseyNumber: string | null
  observations: number
  stablePlayerId: string | null
  rosterLinked: boolean
  onCourt: boolean
}

export function formatAnalysisShootingPercentage(value: number | null): string {
  if (value == null) return '—'
  return `${(value * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`
}

export function formatAnalysisShootingMetric(
  made: number,
  attempted: number,
  percentage: number | null,
): string {
  return `${made}/${attempted} · ${formatAnalysisShootingPercentage(percentage)}`
}

export type AnalysisJobShooterKeys = ReadonlySet<AnalysisJobPlayerKey>

interface ShooterSource {
  stablePlayerId?: string | null
  trackId?: number | null
  teamSide?: AnalysisJobTeamSide | null
}

// Players with at least one attributed shot (stats shots, chart shots, or chart player
// shots, including unresolved results). A shot that carries a stable id is registered
// under the stable key only; the track key is used only for shots without a stable id,
// so two different players sharing a track id are never confused. The side of the shot
// is irrelevant here: a player's scope comes only from its own team side.
export function analysisJobShooterKeys(
  statsShots: AnalysisJobShotStat[] = [],
  chartShots: AnalysisJobShotChartShot[] = [],
  chartPlayers: AnalysisJobShotChartPlayer[] = [],
): Set<AnalysisJobPlayerKey> {
  const keys = new Set<AnalysisJobPlayerKey>()
  const add = (source: ShooterSource) => {
    const key = source.stablePlayerId?.trim()
      ? analysisJobPlayerKey({ stablePlayerId: source.stablePlayerId })
      : analysisJobPlayerKey({ trackId: source.trackId })
    if (key) keys.add(key)
  }
  statsShots.forEach(add)
  chartShots.forEach(add)
  chartPlayers.forEach((player) => player.shots.forEach((shot) => add({
    stablePlayerId: shot.stablePlayerId ?? player.stablePlayerId,
    trackId: shot.trackId ?? player.trackId,
  })))
  return keys
}

function playerShotKeys(player: ShooterSource): AnalysisJobPlayerKey[] {
  const stable = player.stablePlayerId?.trim()
    ? analysisJobPlayerKey({ stablePlayerId: player.stablePlayerId })
    : null
  const track = analysisJobPlayerKey({ trackId: player.trackId })
  return [stable, track].filter((key): key is AnalysisJobPlayerKey => key != null)
}

function shooterMatches(player: ShooterSource, shooters: AnalysisJobShooterKeys): boolean {
  return playerShotKeys(player).some((key) => shooters.has(key))
}

// The player's own team side is the only scope key.
function scopedSide(
  player: ShooterSource,
  scope: readonly AnalysisJobTeamSide[] | undefined,
): AnalysisJobTeamSide | null {
  if (!hasAnalysisJobTeamSide(player)) return null
  const side = player.teamSide as AnalysisJobTeamSide
  return scope == null || scope.includes(side) ? side : null
}

function playerHasShot(
  player: AnalysisJobPlayerShootingStats,
  shooters: AnalysisJobShooterKeys,
): boolean {
  return shooterMatches(player, shooters)
    || player.fieldGoalsAttempted > 0
    || player.twoPointAttempted > 0
    || player.threePointAttempted > 0
    || Object.values(player.byZone).some((zone) => zone.attempted > 0)
}

export function filterAnalysisJobIdentifiedShotChartPlayers(
  players: AnalysisJobShotChartPlayer[],
  playerIdentities: AnalysisJobPlayerShootingStats[] = [],
  scope?: readonly AnalysisJobTeamSide[],
  shooters?: AnalysisJobShooterKeys,
): AnalysisJobShotChartPlayer[] {
  const identitiesByKey = new Map(
    playerIdentities.flatMap((player) => {
      const key = analysisJobPlayerKey(player)
      return key ? [[key, player] as const] : []
    }),
  )
  return players.filter((player) => scopedSide(player, scope) != null
    && (shooters == null || player.shots.length > 0 || shooterMatches(player, shooters))
    && isAnalysisJobPlayerIdentified({
    jerseyNumber: player.jerseyNumber,
    rosterPlayerId: identitiesByKey.get(analysisJobPlayerKey(player) as AnalysisJobPlayerKey)?.rosterPlayerId,
  }))
}

export function buildAnalysisJobPlayerShootingRows(
  players: AnalysisJobPlayerShootingStats[],
  scope?: readonly AnalysisJobTeamSide[],
  shooters?: AnalysisJobShooterKeys,
): AnalysisJobPlayerShootingRow[] {
  const orderedPlayers = players.filter(
    (player) => scopedSide(player, scope) != null
      && (shooters == null || playerHasShot(player, shooters))
      && isAnalysisJobPlayerIdentified(player),
  ).sort(
    (left, right) => Number(right.onCourt) - Number(left.onCourt),
  )
  const labels = buildAnalysisJobPlayerLabels(orderedPlayers)

  return orderedPlayers.flatMap((player) => {
    const key = analysisJobPlayerKey(player)
    if (!key) return []

    return [{
      key,
      label: analysisJobPlayerLabelFromMap(player, labels),
      groupLabel: scopedSide(player, scope) == null
        ? '—'
        : analysisJobTeamGroupLabel(scopedSide(player, scope) as AnalysisJobTeamSide),
      points: player.points,
      fieldGoals: formatAnalysisShootingMetric(
        player.fieldGoalsMade,
        player.fieldGoalsAttempted,
        player.fieldGoalPercentage,
      ),
      twoPoint: formatAnalysisShootingMetric(
        player.twoPointMade,
        player.twoPointAttempted,
        player.twoPointPercentage,
      ),
      threePoint: formatAnalysisShootingMetric(
        player.threePointMade,
        player.threePointAttempted,
        player.threePointPercentage,
      ),
      zones: Object.entries(player.byZone).map(([zone, stats]) => ({
        key: zone,
        made: stats.made,
        attempted: stats.attempted,
        percentage: stats.percentage,
      })),
      jerseyNumber: player.jerseyNumber,
      observations: player.observations,
      stablePlayerId: player.stablePlayerId,
      rosterLinked: Boolean(player.rosterPlayerId || player.rosterName),
      onCourt: player.onCourt,
    }]
  })
}
