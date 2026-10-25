import assert from 'node:assert/strict'
import test from 'node:test'
import {
  NO_MATCH_VALUE,
  matchIdToLink,
  uploadMatchLabel,
  uploadMatchOptions,
} from '../src/pages/videos/video-upload-match.ts'
import { ALL_PLAYERS_TEAM_FILTER, defaultPlayersTeamFilter } from '../src/pages/teams/team-ownership.ts'
import type { MatchRecord } from '../src/types/index.ts'

const match = (id: string, home: string, away: string, matchDate: string) =>
  ({ id, homeTeamId: home, awayTeamId: away, matchDate }) as MatchRecord
const names = new Map([['a', 'Atenas'], ['b', 'Boca']])

test('uploadMatchLabel formats Local vs Visitante with a dd/mm/yyyy date and a fallback name', () => {
  assert.equal(uploadMatchLabel(match('1', 'a', 'b', '2026-03-09'), names), 'Atenas vs Boca · 09/03/2026')
  assert.equal(uploadMatchLabel(match('1', 'a', 'z', '2026-03-09'), names), 'Atenas vs Equipo no disponible · 09/03/2026')
})

test('uploadMatchOptions keeps only the matches of the team, newest first, without mutating the input', () => {
  const input = [match('1', 'a', 'b', '2026-01-01'), match('2', 'c', 'd', '2026-05-01'), match('3', 'b', 'a', '2026-04-01')]
  const options = uploadMatchOptions(input, 'a', names)
  assert.deepEqual(options.map((o) => o.value), ['3', '1'])
  assert.deepEqual(input.map((m) => m.id), ['1', '2', '3'])
  assert.deepEqual(uploadMatchOptions([], 'a', names), [])
})

test('matchIdToLink links only a chosen match that is offered for the team', () => {
  const options = [{ value: '3', label: 'x' }]
  assert.equal(matchIdToLink(NO_MATCH_VALUE, options), null)
  assert.equal(matchIdToLink('', options), null)
  assert.equal(matchIdToLink('9', options), null)
  assert.equal(matchIdToLink('3', options), '3')
})

test('defaultPlayersTeamFilter preselects the team only when there is exactly one own team', () => {
  assert.equal(defaultPlayersTeamFilter([{ id: 'a', isOwn: true }, { id: 'b', isOwn: false }]), 'a')
  assert.equal(defaultPlayersTeamFilter([{ id: 'a', isOwn: true }, { id: 'b', isOwn: true }]), ALL_PLAYERS_TEAM_FILTER)
  assert.equal(defaultPlayersTeamFilter([{ id: 'a', isOwn: false }]), ALL_PLAYERS_TEAM_FILTER)
  assert.equal(defaultPlayersTeamFilter([]), ALL_PLAYERS_TEAM_FILTER)
})
