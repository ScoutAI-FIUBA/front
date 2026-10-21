import assert from 'node:assert/strict'
import test from 'node:test'
import {
  analysisJobPlayerKey,
  analysisJobPlayerLabel,
  analysisJobPlayerLabelFromMap,
  buildAnalysisJobPlayerLabels,
  isAnalysisJobPlayerIdentified,
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

test('identified-player visibility accepts roster identity or a one-to-two digit jersey', () => {
  for (const jerseyNumber of ['0', '00', '7', '23', '99', ' 23 ']) {
    assert.equal(isAnalysisJobPlayerIdentified({ rosterPlayerId: null, jerseyNumber }), true, jerseyNumber)
  }
  for (const jerseyNumber of [null, '', '  ', 'unknown', 'N/A', '-1', '100', 'AB', '1.5']) {
    assert.equal(isAnalysisJobPlayerIdentified({ rosterPlayerId: null, jerseyNumber }), false, String(jerseyNumber))
  }
  assert.equal(isAnalysisJobPlayerIdentified({ rosterPlayerId: 'roster-7', jerseyNumber: null }), true)
  assert.equal(isAnalysisJobPlayerIdentified({ rosterPlayerId: ' roster-7 ', jerseyNumber: 'unknown' }), true)
  assert.equal(isAnalysisJobPlayerIdentified({ rosterPlayerId: '  ', jerseyNumber: '  ' }), false)
  assert.equal(isAnalysisJobPlayerIdentified({}), false)
})

test('stable identity and visible labels do not make a player identified', () => {
  assert.equal(isAnalysisJobPlayerIdentified({
    rosterPlayerId: null,
    jerseyNumber: null,
  }), false)
  assert.equal(
    analysisJobPlayerLabel({ stablePlayerId: 'stable-7', displayName: 'Nombre visible' }),
    'Nombre visible',
  )
})
