import assert from 'node:assert/strict'
import test from 'node:test'
import {
  analysisJobPlayerKey,
  analysisJobPlayerLabel,
  analysisJobPlayerLabelFromMap,
  buildAnalysisJobPlayerLabels,
} from '../src/pages/analysis/analysis-job-player-identity.ts'

test('stable identity is preferred while v1 falls back to track identity', () => {
  assert.equal(
    analysisJobPlayerKey({ stablePlayerId: 'stable-7', trackId: 7 }),
    'stable:stable-7',
  )
  assert.equal(analysisJobPlayerKey({ stablePlayerId: null, trackId: 7 }), 'track:7')
})

test('visible labels prioritize roster and jersey without exposing raw stable ids', () => {
  assert.equal(
    analysisJobPlayerLabel({
      stablePlayerId: 'stable-7',
      trackId: 7,
      rosterName: 'Valentina Pérez',
      jerseyNumber: '12',
      displayName: 'stable-7',
    }),
    'Valentina Pérez',
  )
  assert.equal(
    analysisJobPlayerLabel({
      stablePlayerId: 'stable-7',
      trackId: 7,
      jerseyNumber: '12',
      displayName: 'stable-7',
    }),
    '#12',
  )
  assert.equal(
    analysisJobPlayerLabel({
      stablePlayerId: 'stable-7',
      trackId: 7,
      displayName: 'stable-7',
    }),
    'Jugador detectado',
  )
})

test('multiple anonymous stable players receive neutral local labels', () => {
  const players = [
    { stablePlayerId: 'stable-7', trackId: 7, displayName: 'stable-7' },
    { stablePlayerId: 'stable-9', trackId: 9, displayName: 'stable-9' },
  ]
  const labels = buildAnalysisJobPlayerLabels(players)

  assert.equal(analysisJobPlayerLabelFromMap(players[0]!, labels), 'Jugador detectado 1')
  assert.equal(analysisJobPlayerLabelFromMap(players[1]!, labels), 'Jugador detectado 2')
  assert.doesNotMatch([...labels.values()].join(' '), /stable-/)
})
