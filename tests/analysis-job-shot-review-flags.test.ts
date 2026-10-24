import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  mapAnalysisJobShotChart,
  type ApiAnalysisJobShotChart,
  type ApiAnalysisJobShotChartShot,
} from '../src/services/api/analysis-job-shot-chart.client.ts'
import {
  mapAnalysisJobShootingStats,
  type ApiAnalysisJobShootingStats,
} from '../src/services/api/analysis-job-stats.client.ts'
import {
  countShotsToReview,
  DEFAULT_SHOT_EVIDENCE_FILTERS,
  filterAnalysisJobShots,
  reviewToggleDisabled,
  shotMapEmptyKind,
  shotNeedsReview,
  shotOutcomeEvidenceLabel,
} from '../src/pages/analysis/analysis-job-shot-evidence.ts'
import { summarizeShotsByZone, zoneSummaryEmptyText } from '../src/pages/analysis/analysis-job-zone-summary.ts'
import { filterAnalysisJobShotsByTeam } from '../src/pages/analysis/analysis-job-shot-evidence.ts'
import { shotChartHasReviewShots, shotChartZoneLabel } from '../src/components/analysis/shot-chart-court.ts'
import type { AnalysisJobShotChartShot } from '../src/types/index.ts'

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

// Shot values taken from a real /shot-chart response (jersey and shot fields only).
const realShot: ApiAnalysisJobShotChartShot = {
  shot_id: 1,
  track_id: 4000007,
  stable_player_id: 'player-010',
  team_id: 1,
  jersey_number: '7',
  roster_player_id: null,
  roster_name: null,
  x_m: 23.82,
  y_m: 14.44,
  made: true,
  result: 'made',
  points: 3,
  zone: 'corner_three',
  distance_m: 7.41,
  shot_type: 'jump_shot',
  timestamp_seconds: 6.633333333333334,
  attribution: 'action_box_vote',
  outcome_confidence: 'inferred',
  needs_review: false,
}

function apiChart(shots: ApiAnalysisJobShotChartShot[]): ApiAnalysisJobShotChart {
  return {
    court: {
      length_m: 28, width_m: 15, hoop_inset_m: 1.575,
      hoops: { home: { x_m: 1.575, y_m: 7.5 }, away: { x_m: 26.425, y_m: 7.5 } },
      three_point_radius_m: 6.75, corner_three_lateral_m: 6.6,
    },
    shots,
    players: [],
    coverage: {
      shots_detected: shots.length, shots_scored: shots.length, shots_without_court_position: 0,
      shots_without_shooter: 0, players_tracked: 0, players_with_jersey_number: 0,
      players_linked_to_roster: 0, measures: [], not_measured: [], shots_charted: shots.length,
      filtered_to_track_id: null,
    },
  }
}

function shot(overrides: Partial<AnalysisJobShotChartShot> = {}): AnalysisJobShotChartShot {
  const mapped = mapAnalysisJobShotChart(apiChart([realShot])).shots[0]
  return { ...mapped, ...overrides }
}

test('shot chart mapper reads outcome confidence and review flag', () => {
  const chart = mapAnalysisJobShotChart(apiChart([
    realShot,
    { ...realShot, shot_id: 2, outcome_confidence: 'timeout', needs_review: true },
  ]))
  assert.equal(chart.shots[0].outcomeConfidence, 'inferred')
  assert.equal(chart.shots[0].needsReview, false)
  assert.equal(chart.shots[1].outcomeConfidence, 'timeout')
  assert.equal(chart.shots[1].needsReview, true)
  assert.equal(chart.shots[0].points, 3)
  assert.equal(chart.shots[0].jerseyNumber, '7')
})

test('shot chart mapper tolerates missing or unknown values', () => {
  const { outcome_confidence: _a, needs_review: _b, ...legacy } = realShot
  void _a; void _b
  const [absent, nulls, weird] = mapAnalysisJobShotChart(apiChart([
    legacy,
    { ...realShot, outcome_confidence: null, needs_review: null },
    { ...realShot, outcome_confidence: 'maybe', needs_review: 'yes' as unknown as boolean },
  ])).shots
  for (const mapped of [absent, nulls, weird]) {
    assert.equal(mapped.outcomeConfidence, null)
    assert.equal(mapped.needsReview, null)
  }
})

test('stats mapper carries the same two fields', () => {
  const base = {
    job_id: 'j', video_id: 'v', our_team_side: 1, teams: [], players: [],
    coverage: {
      shots_detected: 1, shots_scored: 1, shots_without_court_position: 0, shots_without_shooter: 0,
      players_tracked: 0, players_with_jersey_number: 0, players_linked_to_roster: 0, measures: [], not_measured: [],
    },
  }
  const statShot = {
    shot_id: 1, track_id: 4000007, team_id: 1 as const, jersey_number: '7', roster_player_id: null, roster_name: null,
    made: true, outcome: 'made', points: 3 as const, zone: 'corner_three', distance_m: 7.41,
    court_x_m: 23.82, court_y_m: 14.44, timestamp_seconds: 6.6, shot_type: 'jump_shot', attribution: null,
  }
  const stats = mapAnalysisJobShootingStats({
    ...base,
    shots: [statShot, { ...statShot, shot_id: 2, outcome_confidence: 'unresolved', needs_review: true }],
  } as ApiAnalysisJobShootingStats)
  assert.equal(stats.shots[0].outcomeConfidence, null)
  assert.equal(stats.shots[0].needsReview, null)
  assert.equal(stats.shots[1].outcomeConfidence, 'unresolved')
  assert.equal(stats.shots[1].needsReview, true)
})

test('evidence labels are plain Spanish and null when unknown', () => {
  assert.equal(shotOutcomeEvidenceLabel('detected'), 'Se vio entrar el balón')
  assert.equal(shotOutcomeEvidenceLabel('inferred'), 'Inferido por la trayectoria del balón')
  assert.equal(shotOutcomeEvidenceLabel('timeout'), 'No se vio entrar el balón: se cuenta como fallado')
  assert.equal(shotOutcomeEvidenceLabel('unresolved'), 'Sin resolver')
  assert.equal(shotOutcomeEvidenceLabel(null), null)
  assert.equal(shotOutcomeEvidenceLabel(undefined), null)
})

test('review filter is off by default and only keeps needsReview === true', () => {
  assert.equal(DEFAULT_SHOT_EVIDENCE_FILTERS.reviewOnly, false)
  const shots = [
    shot({ shotId: 1, needsReview: true }),
    shot({ shotId: 2, needsReview: false }),
    shot({ shotId: 3, needsReview: null }),
  ]
  assert.equal(filterAnalysisJobShots(shots, DEFAULT_SHOT_EVIDENCE_FILTERS, 1).length, 3)
  const reviewed = filterAnalysisJobShots(shots, { ...DEFAULT_SHOT_EVIDENCE_FILTERS, reviewOnly: true }, 1)
  assert.deepEqual(reviewed.map((s) => s.shotId), [1])
  assert.equal(shotNeedsReview(shots[2]), false)
  assert.equal(countShotsToReview(shots), 1)
})

test('review filter combines with Equipo, player and zone filters', () => {
  const shots = [
    shot({ shotId: 1, teamSide: 1, needsReview: true, zone: 'paint', stablePlayerId: 'a' }),
    shot({ shotId: 2, teamSide: 0, needsReview: true, zone: 'paint', stablePlayerId: 'b' }),
    shot({ shotId: 3, teamSide: 1, needsReview: true, zone: 'mid_range', stablePlayerId: 'a' }),
    shot({ shotId: 4, teamSide: null, needsReview: true, zone: 'paint', stablePlayerId: 'a' }),
  ]
  const on = { ...DEFAULT_SHOT_EVIDENCE_FILTERS, reviewOnly: true }
  const ids = (filters: typeof on) => filterAnalysisJobShots(shots, filters, 1).map((s) => s.shotId)
  assert.deepEqual(ids(on), [1, 3])
  assert.deepEqual(ids({ ...on, team: 'rival' }), [2])
  assert.deepEqual(ids({ ...on, team: 'both' }), [1, 2, 3, 4])
  assert.deepEqual(ids({ ...on, zone: 'paint' }), [1])
  assert.deepEqual(ids({ ...on, player: 'stable:a' as never }), [1, 3])
  // Summary count ignores the toggle itself.
  const count = countShotsToReview(filterAnalysisJobShots(shots, { ...on, reviewOnly: false }, 1))
  assert.equal(count, 2)
})

test('zone summary follows the team scope and excludes unknown results from attempts', () => {
  const shots = [
    shot({ shotId: 1, teamSide: 1, zone: 'paint', result: 'made' }),
    shot({ shotId: 2, teamSide: 1, zone: 'paint', result: 'missed' }),
    shot({ shotId: 3, teamSide: 1, zone: 'paint', result: 'unknown' }),
    shot({ shotId: 4, teamSide: 1, zone: 'above_the_break_three', result: 'unknown' }),
    shot({ shotId: 5, teamSide: 1, zone: 'at_the_rim', result: 'made' }),
    shot({ shotId: 6, teamSide: 0, zone: 'mid_range', result: 'made' }),
    shot({ shotId: 7, teamSide: null, zone: 'mid_range', result: 'missed' }),
  ]
  const own = summarizeShotsByZone(filterAnalysisJobShotsByTeam(shots, 'own', 1))
  assert.deepEqual(own.rows.map((r) => r.zone), ['at_the_rim', 'paint', 'above_the_break_three'])
  const paint = own.rows[1]
  assert.deepEqual([paint.attempted, paint.made, paint.unknown, paint.percentage], [2, 1, 1, 0.5])
  const three = own.rows[2]
  assert.deepEqual([three.attempted, three.made, three.unknown, three.percentage], [0, 0, 1, null])
  assert.deepEqual([own.total.attempted, own.total.made, own.total.unknown], [3, 2, 2])
  assert.equal(own.total.percentage, 2 / 3)

  const rival = summarizeShotsByZone(filterAnalysisJobShotsByTeam(shots, 'rival', 1))
  assert.deepEqual(rival.rows.map((r) => r.zone), ['mid_range'])
  const both = summarizeShotsByZone(filterAnalysisJobShotsByTeam(shots, 'both', 1))
  assert.deepEqual(both.rows.map((r) => r.zone), ['at_the_rim', 'paint', 'mid_range', 'above_the_break_three'])
  assert.equal(both.total.attempted, 5)
})

test('zone summary handles an empty scope and unrecognised zones', () => {
  const empty = summarizeShotsByZone([])
  assert.deepEqual(empty.rows, [])
  assert.equal(empty.total.attempted, 0)
  assert.equal(empty.total.percentage, null)
  const odd = summarizeShotsByZone([shot({ zone: 'zz_other' }), shot({ zone: 'paint' })])
  assert.deepEqual(odd.rows.map((r) => r.zone), ['paint', 'zz_other'])
})

test('map empty state: review text only when the review filter emptied the selection', () => {
  assert.equal(shotMapEmptyKind(false, 3, 2), null)
  assert.equal(shotMapEmptyKind(true, 1, 1), null)
  assert.equal(shotMapEmptyKind(true, 0, 0), 'review')
  assert.equal(shotMapEmptyKind(false, 0, 0), 'coordinates')
  assert.equal(shotMapEmptyKind(true, 2, 0), 'coordinates')
})

test('review toggle is disabled only when off and nothing is flagged', () => {
  assert.equal(reviewToggleDisabled(false, 0), true)
  assert.equal(reviewToggleDisabled(false, 2), false)
  assert.equal(reviewToggleDisabled(true, 0), false)
})

test('legend and ring condition, zone labels and zone-table empty text', () => {
  assert.equal(shotChartHasReviewShots([]), false)
  assert.equal(shotChartHasReviewShots([{ needsReview: false }, { needsReview: null }]), false)
  assert.equal(shotChartHasReviewShots([{ needsReview: false }, { needsReview: true }]), true)
  assert.equal(shotChartZoneLabel('corner_three'), 'Triple de esquina')
  assert.equal(shotChartZoneLabel('Pintura'), 'Pintura')
  assert.equal(zoneSummaryEmptyText('both'), 'No hay tiros detectados.')
  assert.equal(zoneSummaryEmptyText('own'), 'No hay tiros detectados para este equipo.')
})

test('UI exposes the legend, badges, toggle and zone table without jargon', () => {
  const workspace = readSource('../src/pages/analysis/AnalysisJobShotsWorkspace.tsx')
  const court = readSource('../src/components/analysis/ShotChartCourt.tsx')
  const evidence = readSource('../src/pages/analysis/analysis-job-shot-evidence.ts')
  const zones = readSource('../src/pages/analysis/analysis-job-zone-summary.ts')
  assert.match(court, /Conviene revisar/)
  assert.match(court, /border-dashed border-amber-400/)
  assert.match(court, /hasReviewShots &&/)
  assert.match(workspace, />Revisar</)
  assert.match(workspace, /Solo tiros a revisar/)
  assert.match(workspace, /tiros conviene revisarlos/)
  assert.match(workspace, /Tiros por zona/)
  assert.match(workspace, /No hay tiros para revisar en esta selección/)
  assert.match(workspace, /Evidencia del resultado/)
  assert.match(evidence, /El sistema no está seguro de este tiro\. Conviene verlo en el video\./)
  // The auto-reset guard must not depend on the review toggle.
  assert.doesNotMatch(workspace, /filters\.reviewOnly\]/)
  assert.match(workspace, /\[job\.id, job\.ourTeamSide\]/)
  // The jargon check must be able to fail.
  const jargon = /observaciones|muestras/i
  assert.match('3 muestras', jargon)
  for (const text of [workspace, court, evidence, zones]) {
    assert.doesNotMatch(text, jargon)
  }
})
