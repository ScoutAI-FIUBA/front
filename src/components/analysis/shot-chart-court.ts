import type {
  AnalysisJobShotChartCourt,
  AnalysisJobShotChartShot,
  ShotChartResult,
} from '../../types/index.ts'

export interface ShotChartUiPoint {
  leftPercent: number
  topPercent: number
}

export function shotChartPointToPercent(
  court: AnalysisJobShotChartCourt,
  shot: Pick<AnalysisJobShotChartShot, 'xM' | 'yM'>,
): ShotChartUiPoint | null {
  if (!Number.isFinite(court.lengthM) || court.lengthM <= 0) return null
  if (!Number.isFinite(court.widthM) || court.widthM <= 0) return null
  if (!Number.isFinite(shot.xM) || !Number.isFinite(shot.yM)) return null
  if (shot.xM < 0 || shot.xM > court.lengthM) return null
  if (shot.yM < 0 || shot.yM > court.widthM) return null

  return {
    leftPercent: (shot.xM / court.lengthM) * 100,
    topPercent: (shot.yM / court.widthM) * 100,
  }
}

export function shotChartResultLabel(result: ShotChartResult): string {
  if (result === 'made') return 'Convertido'
  if (result === 'missed') return 'Fallado'
  return 'Resultado desconocido'
}

const ZONE_DISPLAY_LABELS: Record<string, string> = {
  at_the_rim: 'Cerca del aro',
  paint: 'Pintura',
  mid_range: 'Media distancia',
  corner_three: 'Triple de esquina',
  above_the_break_three: 'Triple frontal',
}

/** Spanish zone label; values that are already labels pass through unchanged. */
export function shotChartZoneLabel(zone: string): string {
  return ZONE_DISPLAY_LABELS[zone] ?? zone
}

/** The review ring and its legend entry only exist when some shot is flagged. */
export function shotChartHasReviewShots(shots: Array<Pick<AnalysisJobShotChartShot, 'needsReview'>>): boolean {
  return shots.some((shot) => shot.needsReview === true)
}
