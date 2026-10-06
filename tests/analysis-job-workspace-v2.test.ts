import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import type { AnalysisJobShotChartShot } from '../src/types/index.ts'
import {
  analysisShotKey,
  DEFAULT_SHOT_EVIDENCE_FILTERS,
  filterAnalysisJobShots,
  shotHasVideoEvidence,
} from '../src/pages/analysis/analysis-job-shot-evidence.ts'

const readSource = (relativePath: string) => readFileSync(
  new URL(relativePath, import.meta.url),
  'utf8',
)

function shot(overrides: Partial<AnalysisJobShotChartShot> = {}): AnalysisJobShotChartShot {
  return {
    shotId: 1,
    trackId: 7,
    stablePlayerId: null,
    teamSide: 1,
    jerseyNumber: '7',
    rosterPlayerId: null,
    rosterName: null,
    xM: 14,
    yM: 7.5,
    made: true,
    result: 'made',
    points: 2,
    zone: 'paint',
    distanceM: 2.5,
    shotType: null,
    timestampSeconds: 18,
    attribution: null,
    ...overrides,
  }
}

test('only shots with a real non-negative timestamp expose video evidence', () => {
  assert.equal(shotHasVideoEvidence(shot({ timestampSeconds: 18 })), true)
  assert.equal(shotHasVideoEvidence(shot({ timestampSeconds: 0 })), true)
  assert.equal(shotHasVideoEvidence(shot({ timestampSeconds: null })), false)
  assert.equal(shotHasVideoEvidence(shot({ timestampSeconds: -1 })), false)
  assert.equal(shotHasVideoEvidence(shot({ timestampSeconds: Number.NaN })), false)

  const source = readSource('../src/pages/analysis/AnalysisJobShotsWorkspace.tsx')
  assert.match(source, /if \(shotHasVideoEvidence\(shot\)\) onSeekToVideo/)
  assert.match(source, /const hasEvidence = shotHasVideoEvidence\(shot\)/)
  assert.match(source, /No vinculado/)
})

test('shot drill-down filters existing moments locally and keeps unknown distinct', () => {
  const shots = [
    shot(),
    shot({ shotId: 2, result: 'missed', made: false, points: 3, zone: 'corner_three' }),
    shot({ shotId: 3, result: 'unknown', made: false, trackId: null }),
  ]

  assert.equal(filterAnalysisJobShots(shots, DEFAULT_SHOT_EVIDENCE_FILTERS).length, 3)
  assert.deepEqual(
    filterAnalysisJobShots(shots, { ...DEFAULT_SHOT_EVIDENCE_FILTERS, result: 'unknown' }).map((item) => item.shotId),
    [3],
  )
  assert.deepEqual(
    filterAnalysisJobShots(shots, { ...DEFAULT_SHOT_EVIDENCE_FILTERS, points: '3' }).map((item) => item.shotId),
    [2],
  )
})

test('shot filtering and fallback selection prefer stable identity with track fallback', () => {
  const stableShot = shot({ shotId: null, trackId: 7, stablePlayerId: 'stable-player-a' })
  const samePlayerNewTrack = shot({ shotId: null, trackId: 18, stablePlayerId: 'stable-player-a' })
  const legacyShot = shot({ shotId: 3, trackId: 9, stablePlayerId: null })

  assert.deepEqual(
    filterAnalysisJobShots(
      [stableShot, legacyShot],
      { ...DEFAULT_SHOT_EVIDENCE_FILTERS, player: 'stable:stable-player-a' },
    ),
    [stableShot],
  )
  assert.deepEqual(
    filterAnalysisJobShots(
      [stableShot, legacyShot],
      { ...DEFAULT_SHOT_EVIDENCE_FILTERS, player: 'track:9' },
    ),
    [legacyShot],
  )
  assert.equal(analysisShotKey(stableShot, 0), analysisShotKey(samePlayerNewTrack, 12))
})

test('fallback shot identity remains stable across filtered arrays', () => {
  const withoutId = shot({ shotId: null })
  assert.equal(analysisShotKey(withoutId, 0), analysisShotKey(withoutId, 12))
})

test('the embedded player has explicit loading, error, retry, and stable seek behavior', () => {
  const source = readSource('../src/pages/analysis/AnalysisWorkspaceVideo.tsx')
  assert.match(source, /forwardRef/)
  assert.match(source, /useImperativeHandle/)
  assert.match(source, /seekTo\(seconds\)/)
  assert.match(source, /Preparando video/)
  assert.match(source, /No pudimos cargar el video fuente/)
  assert.match(source, /Reintentar/)
  assert.match(source, /restoreTimeRef/)
  assert.match(source, /getVideoByIdForTeam\(videoId, teamId\)/)
})

test('workspace module switching keeps one player mounted outside hidden result panels', () => {
  const source = readSource('../src/pages/analysis/AnalysisJobResultsWorkspace.tsx')
  assert.equal(source.match(/<AnalysisWorkspaceVideo\s/g)?.length, 1)
  assert.match(source, /hidden=\{activeSection !== 'overview'\}/)
  assert.match(source, /hidden=\{activeSection !== 'shots'\}/)
  assert.match(source, /hidden=\{activeSection !== 'movement'\}/)
  assert.ok(source.indexOf('<AnalysisWorkspaceVideo') < source.indexOf("hidden={activeSection !== 'overview'}"))
})

test('Shots uses a master-detail layout and avoids nested vertical scroll on mobile', () => {
  const source = readSource('../src/pages/analysis/AnalysisJobShotsWorkspace.tsx')

  assert.match(source, /Tiros y evidencia/)
  assert.match(source, /<SelectedShotDetail/)
  assert.match(source, /Explorar todos los momentos/)
  assert.match(source, /lg:grid-cols-\[minmax\(0,1\.3fr\)_minmax\(250px,0\.7fr\)\]/)
  assert.match(source, /lg:max-h-64 lg:overflow-y-auto/)
  assert.doesNotMatch(source, /(?<!lg:)max-h-\d+/)
  assert.doesNotMatch(source, /(?<!lg:)overflow-y-auto/)
})

test('mobile analysis navigation is Spanish, keyboard-native, and horizontally discoverable', () => {
  const source = readSource('../src/pages/analysis/AnalysisJobResultsWorkspace.tsx')

  for (const label of ['Resumen', 'Tiros', 'Movimiento', 'Similares', 'Detalles']) {
    assert.match(source, new RegExp(`label: '${label}'`))
  }
  assert.match(source, /aria-label="Secciones del análisis"/)
  assert.match(source, /<button/)
  assert.match(source, /overflow-x-auto/)
  assert.match(source, /snap-mandatory/)
  assert.match(source, /\[scrollbar-width:none\]/)
  assert.match(source, /bg-gradient-to-l/)
  assert.match(source, /scrollIntoView/)
})

test('video failure uses a compact panel and expands the analysis column', () => {
  const videoSource = readSource('../src/pages/analysis/AnalysisWorkspaceVideo.tsx')
  const pageSource = readSource('../src/pages/analysis/AnalysisJobResultsWorkspace.tsx')

  assert.match(videoSource, /min-h-44[^"\n]*sm:min-h-52/)
  assert.doesNotMatch(videoSource, /aspect-video[^\n]*No pudimos cargar el video fuente/)
  assert.match(pageSource, /videoState === 'error'/)
  assert.match(pageSource, /minmax\(340px,0\.72fr\)_minmax\(620px,1\.28fr\)/)
})
