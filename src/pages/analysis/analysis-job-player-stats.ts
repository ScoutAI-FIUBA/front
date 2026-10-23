import type {
  AnalysisJobPlayerShootingStats,
  AnalysisJobShotChartPlayer,
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

export function filterAnalysisJobIdentifiedShotChartPlayers(
  players: AnalysisJobShotChartPlayer[],
  playerIdentities: AnalysisJobPlayerShootingStats[] = [],
): AnalysisJobShotChartPlayer[] {
  const identitiesByKey = new Map(
    playerIdentities.flatMap((player) => {
      const key = analysisJobPlayerKey(player)
      return key ? [[key, player] as const] : []
    }),
  )
  return players.filter((player) => hasAnalysisJobTeamSide(player) && isAnalysisJobPlayerIdentified({
    jerseyNumber: player.jerseyNumber,
    rosterPlayerId: identitiesByKey.get(analysisJobPlayerKey(player) as AnalysisJobPlayerKey)?.rosterPlayerId,
  }))
}

export function buildAnalysisJobPlayerShootingRows(
  players: AnalysisJobPlayerShootingStats[],
): AnalysisJobPlayerShootingRow[] {
  const orderedPlayers = players.filter(
    (player) => hasAnalysisJobTeamSide(player) && isAnalysisJobPlayerIdentified(player),
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
      groupLabel: player.teamSide == null ? '—' : analysisJobTeamGroupLabel(player.teamSide),
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
