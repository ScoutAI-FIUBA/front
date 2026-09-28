import type { AnalysisJobShotChartShot, ShotChartResult } from '../../types/index.ts'

export type ShotEvidenceResultFilter = 'all' | ShotChartResult
export type ShotEvidencePointsFilter = 'all' | '2' | '3'

export interface ShotEvidenceFilters {
  result: ShotEvidenceResultFilter
  points: ShotEvidencePointsFilter
  trackId: 'all' | number
  zone: 'all' | string
}

export const DEFAULT_SHOT_EVIDENCE_FILTERS: ShotEvidenceFilters = {
  result: 'all',
  points: 'all',
  trackId: 'all',
  zone: 'all',
}

export function analysisShotKey(shot: AnalysisJobShotChartShot, index: number): string {
  void index
  if (shot.shotId != null) return `shot:${shot.shotId}`
  return [
    'detected',
    shot.trackId ?? 'unknown-track',
    shot.timestampSeconds ?? 'no-time',
    shot.points,
    shot.zone,
    shot.xM,
    shot.yM,
  ].join(':')
}

export function filterAnalysisJobShots(
  shots: AnalysisJobShotChartShot[],
  filters: ShotEvidenceFilters,
): AnalysisJobShotChartShot[] {
  return shots.filter((shot) => (
    (filters.result === 'all' || shot.result === filters.result)
    && (filters.points === 'all' || shot.points === Number(filters.points))
    && (filters.trackId === 'all' || shot.trackId === filters.trackId)
    && (filters.zone === 'all' || shot.zone === filters.zone)
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
