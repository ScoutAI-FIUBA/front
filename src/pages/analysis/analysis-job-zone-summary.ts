import type { AnalysisJobShotChartShot } from '../../types/index.ts'

export const ZONE_ORDER = [
  'at_the_rim',
  'paint',
  'mid_range',
  'corner_three',
  'above_the_break_three',
] as const

export interface ZoneSummaryRow {
  zone: string
  attempted: number
  made: number
  unknown: number
  /** made / attempted, null when the zone has no attempts. */
  percentage: number | null
}

export interface ZoneSummary {
  rows: ZoneSummaryRow[]
  total: ZoneSummaryRow
}

function zoneRank(zone: string): number {
  const index = (ZONE_ORDER as readonly string[]).indexOf(zone)
  return index === -1 ? ZONE_ORDER.length : index
}

function withPercentage(row: Omit<ZoneSummaryRow, 'percentage'>): ZoneSummaryRow {
  return { ...row, percentage: row.attempted > 0 ? row.made / row.attempted : null }
}

/**
 * Per-zone shooting of the given shots. Unknown results are not attempts (same
 * rule as the box score) and are only counted in `unknown`.
 */
export function summarizeShotsByZone(
  shots: Array<Pick<AnalysisJobShotChartShot, 'zone' | 'result'>>,
): ZoneSummary {
  const byZone = new Map<string, Omit<ZoneSummaryRow, 'percentage'>>()
  for (const shot of shots) {
    const row = byZone.get(shot.zone) ?? { zone: shot.zone, attempted: 0, made: 0, unknown: 0 }
    if (shot.result === 'made') {
      row.attempted += 1
      row.made += 1
    } else if (shot.result === 'missed') {
      row.attempted += 1
    } else {
      row.unknown += 1
    }
    byZone.set(shot.zone, row)
  }
  const raw = [...byZone.values()].sort((left, right) => (
    zoneRank(left.zone) - zoneRank(right.zone) || left.zone.localeCompare(right.zone)
  ))
  return {
    rows: raw.map(withPercentage),
    total: withPercentage({
      zone: 'total',
      attempted: raw.reduce((sum, row) => sum + row.attempted, 0),
      made: raw.reduce((sum, row) => sum + row.made, 0),
      unknown: raw.reduce((sum, row) => sum + row.unknown, 0),
    }),
  }
}
