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

export type AnalysisJobShooterSides = ReadonlyMap<AnalysisJobPlayerKey, ReadonlySet<AnalysisJobTeamSide | null>>

interface ShooterSource {
  stablePlayerId?: string | null
  trackId?: number | null
  teamSide?: AnalysisJobTeamSide | null
}

function shooterKeysOf(source: ShooterSource): AnalysisJobPlayerKey[] {
  const keys: AnalysisJobPlayerKey[] = []
  const stable = analysisJobPlayerKey({ stablePlayerId: source.stablePlayerId })
  const track = analysisJobPlayerKey({ trackId: source.trackId })
  if (stable) keys.push(stable)
  if (track) keys.push(track)
  return keys
}

// Players with at least one attributed shot (stats shots, chart shots, or chart player
// shots, including unresolved results), with the team side each shot reports. Shots are
// registered under both the stable and the track key so a stats player and a chart shot
// keyed differently still match.
export function analysisJobShooterSides(
  statsShots: AnalysisJobShotStat[] = [],
  chartShots: AnalysisJobShotChartShot[] = [],
  chartPlayers: AnalysisJobShotChartPlayer[] = [],
): Map<AnalysisJobPlayerKey, Set<AnalysisJobTeamSide | null>> {
  const sides = new Map<AnalysisJobPlayerKey, Set<AnalysisJobTeamSide | null>>()
  const add = (source: ShooterSource, side: AnalysisJobTeamSide | null) => {
    shooterKeysOf(source).forEach((key) => {
      const current = sides.get(key) ?? new Set<AnalysisJobTeamSide | null>()
      current.add(side)
      sides.set(key, current)
    })
  }
  const shotSources = [
    ...statsShots,
    ...chartShots,
    ...chartPlayers.flatMap((player) => player.shots.map((shot) => ({
      stablePlayerId: shot.stablePlayerId ?? player.stablePlayerId,
      trackId: shot.trackId ?? player.trackId,
      teamSide: shot.teamSide ?? player.teamSide,
    }))),
  ]
  shotSources.forEach((shot) => add(shot, shot.teamSide ?? null))
  return sides
}

function shotSidesFor(
  player: ShooterSource,
  shooters: AnalysisJobShooterSides,
): Set<AnalysisJobTeamSide | null> {
  const sides = new Set<AnalysisJobTeamSide | null>()
  shooterKeysOf(player).forEach((key) => shooters.get(key)?.forEach((side) => sides.add(side)))
  return sides
}

// A player belongs to the scope by its own team side or by the side of a shot it took.
function scopedSide(
  player: ShooterSource,
  scope: readonly AnalysisJobTeamSide[] | undefined,
  shooters: AnalysisJobShooterSides | undefined,
): AnalysisJobTeamSide | null {
  if (scope == null) return hasAnalysisJobTeamSide(player) ? player.teamSide as AnalysisJobTeamSide : null
  if (hasAnalysisJobTeamSide(player) && scope.includes(player.teamSide as AnalysisJobTeamSide)) {
    return player.teamSide as AnalysisJobTeamSide
  }
  const fromShot = shooters
    ? [...shotSidesFor(player, shooters)].find((side): side is AnalysisJobTeamSide => side != null && scope.includes(side))
    : undefined
  return fromShot ?? null
}

function playerHasShot(
  player: AnalysisJobPlayerShootingStats,
  shooters: AnalysisJobShooterSides,
): boolean {
  return shotSidesFor(player, shooters).size > 0
    || player.fieldGoalsAttempted > 0
    || player.twoPointAttempted > 0
    || player.threePointAttempted > 0
    || Object.values(player.byZone).some((zone) => zone.attempted > 0)
}

export function filterAnalysisJobIdentifiedShotChartPlayers(
  players: AnalysisJobShotChartPlayer[],
  playerIdentities: AnalysisJobPlayerShootingStats[] = [],
  scope?: readonly AnalysisJobTeamSide[],
  shooters?: AnalysisJobShooterSides,
): AnalysisJobShotChartPlayer[] {
  const identitiesByKey = new Map(
    playerIdentities.flatMap((player) => {
      const key = analysisJobPlayerKey(player)
      return key ? [[key, player] as const] : []
    }),
  )
  return players.filter((player) => scopedSide(player, scope, shooters) != null
    && (shooters == null || player.shots.length > 0 || shotSidesFor(player, shooters).size > 0)
    && isAnalysisJobPlayerIdentified({
    jerseyNumber: player.jerseyNumber,
    rosterPlayerId: identitiesByKey.get(analysisJobPlayerKey(player) as AnalysisJobPlayerKey)?.rosterPlayerId,
  }))
}

export function buildAnalysisJobPlayerShootingRows(
  players: AnalysisJobPlayerShootingStats[],
  scope?: readonly AnalysisJobTeamSide[],
  shooters?: AnalysisJobShooterSides,
): AnalysisJobPlayerShootingRow[] {
  const orderedPlayers = players.filter(
    (player) => scopedSide(player, scope, shooters) != null
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
      groupLabel: scopedSide(player, scope, shooters) == null
        ? '—'
        : analysisJobTeamGroupLabel(scopedSide(player, scope, shooters) as AnalysisJobTeamSide),
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
