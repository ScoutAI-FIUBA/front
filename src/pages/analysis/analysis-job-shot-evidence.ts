import type {
  AnalysisJobShotChartShot,
  AnalysisJobTeamSide,
  PlayerShotOutcomeConfidence,
  ShotChartResult,
} from '../../types/index.ts'
import {
  analysisJobPlayerKey,
  type AnalysisJobPlayerKey,
} from './analysis-job-player-identity.ts'

export type ShotEvidenceResultFilter = 'all' | ShotChartResult
export type ShotEvidencePointsFilter = 'all' | '2' | '3'

export type ShotEvidenceTeamFilter = 'own' | 'rival' | 'both'

export interface ShotEvidenceFilters {
  team: ShotEvidenceTeamFilter
  result: ShotEvidenceResultFilter
  points: ShotEvidencePointsFilter
  player: 'all' | AnalysisJobPlayerKey
  zone: 'all' | string
  reviewOnly: boolean
}

export const DEFAULT_SHOT_EVIDENCE_FILTERS: ShotEvidenceFilters = {
  team: 'own',
  result: 'all',
  points: 'all',
  player: 'all',
  zone: 'all',
  reviewOnly: false,
}

export function analysisShotKey(shot: AnalysisJobShotChartShot, index: number): string {
  void index
  if (shot.shotId != null) return `shot:${shot.shotId}`
  return [
    'detected',
    analysisJobPlayerKey(shot) ?? 'unknown-player',
    shot.timestampSeconds ?? 'no-time',
    shot.points,
    shot.zone,
    shot.xM,
    shot.yM,
  ].join(':')
}

export function otherAnalysisJobTeamSide(side: AnalysisJobTeamSide): AnalysisJobTeamSide {
  return side === 0 ? 1 : 0
}

export function analysisJobShotTeamScope(
  team: ShotEvidenceTeamFilter,
  ourTeamSide: AnalysisJobTeamSide,
): AnalysisJobTeamSide[] {
  if (team === 'both') return [0, 1]
  return [team === 'own' ? ourTeamSide : otherAnalysisJobTeamSide(ourTeamSide)]
}

export function filterAnalysisJobShotsByTeam(
  shots: AnalysisJobShotChartShot[],
  team: ShotEvidenceTeamFilter,
  ourTeamSide: AnalysisJobTeamSide,
): AnalysisJobShotChartShot[] {
  if (team === 'both') return shots
  const side = team === 'own' ? ourTeamSide : otherAnalysisJobTeamSide(ourTeamSide)
  return shots.filter((shot) => shot.teamSide === side)
}

export function filterAnalysisJobShots(
  shots: AnalysisJobShotChartShot[],
  filters: ShotEvidenceFilters,
  ourTeamSide?: AnalysisJobTeamSide,
): AnalysisJobShotChartShot[] {
  const scoped = ourTeamSide == null ? shots : filterAnalysisJobShotsByTeam(shots, filters.team, ourTeamSide)
  return scoped.filter((shot) => (
    (filters.result === 'all' || shot.result === filters.result)
    && (filters.points === 'all' || shot.points === Number(filters.points))
    && (filters.player === 'all' || analysisJobPlayerKey(shot) === filters.player)
    && (filters.zone === 'all' || shot.zone === filters.zone)
    && (!filters.reviewOnly || shotNeedsReview(shot))
  ))
}

export function shotHasVideoEvidence(shot: AnalysisJobShotChartShot): boolean {
  return shot.timestampSeconds != null
    && Number.isFinite(shot.timestampSeconds)
    && shot.timestampSeconds >= 0
}

export function formatShotTimestamp(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(wholeSeconds / 60)
  const remainder = wholeSeconds % 60
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

export function shotNeedsReview(shot: Pick<AnalysisJobShotChartShot, 'needsReview'>): boolean {
  return shot.needsReview === true
}

export const SHOT_REVIEW_EXPLANATION = 'El sistema no está seguro de este tiro. Conviene verlo en el video.'

export function shotOutcomeEvidenceLabel(
  confidence: PlayerShotOutcomeConfidence | null | undefined,
): string | null {
  if (confidence === 'detected') return 'Se vio entrar el balón'
  if (confidence === 'inferred') return 'Inferido por la trayectoria del balón'
  if (confidence === 'timeout') return 'No se vio el aro: se asume fallado'
  if (confidence === 'unresolved') return 'Sin resolver'
  return null
}

export function countShotsToReview(shots: Array<Pick<AnalysisJobShotChartShot, 'needsReview'>>): number {
  return shots.filter(shotNeedsReview).length
}
