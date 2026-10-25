import assert from 'node:assert/strict'
import test from 'node:test'
import {
  OWN_TEAM_BADGE,
  defaultOwnFilter,
  filterTeamsByOwnership,
  sortTeamsOwnFirst,
} from '../src/pages/teams/team-ownership.ts'
import { mapApiTeam, toTeamPayload } from '../src/services/api/mappers.ts'

const team = (id: string, isOwn: boolean) => ({ id, isOwn })

test('sortTeamsOwnFirst puts own teams first and keeps the order inside each group', () => {
  const sorted = sortTeamsOwnFirst([team('a', false), team('b', true), team('c', false), team('d', true)])
  assert.deepEqual(sorted.map((t) => t.id), ['b', 'd', 'a', 'c'])
})

test('sortTeamsOwnFirst handles empty lists and does not mutate the input', () => {
  assert.deepEqual(sortTeamsOwnFirst([]), [])
  const input = [team('a', false), team('b', true)]
  sortTeamsOwnFirst(input)
  assert.deepEqual(input.map((t) => t.id), ['a', 'b'])
})

test('defaultOwnFilter is own only when some team is own', () => {
  assert.equal(defaultOwnFilter([team('a', false), team('b', true)]), 'own')
  assert.equal(defaultOwnFilter([team('a', false)]), 'all')
  assert.equal(defaultOwnFilter([]), 'all')
})

test('filterTeamsByOwnership splits own teams and rivals', () => {
  const teams = [team('a', false), team('b', true), team('c', false)]
  assert.deepEqual(filterTeamsByOwnership(teams, 'own').map((t) => t.id), ['b'])
  assert.deepEqual(filterTeamsByOwnership(teams, 'rivals').map((t) => t.id), ['a', 'c'])
  assert.deepEqual(filterTeamsByOwnership(teams, 'all').map((t) => t.id), ['a', 'b', 'c'])
})

test('the badge copy is Mi equipo', () => {
  assert.equal(OWN_TEAM_BADGE, 'Mi equipo')
})

test('mapApiTeam defaults a missing is_own to false and reads true', () => {
  const base = { id: 't', name: 'N', short_name: 'N', city: 'c', country: 'p' }
  assert.equal(mapApiTeam(base).isOwn, false)
  assert.equal(mapApiTeam({ ...base, is_own: true }).isOwn, true)
})

test('toTeamPayload sends is_own only when it is defined', () => {
  const dto = { name: 'N', shortName: 'N', city: 'c', country: 'p' }
  assert.equal('is_own' in toTeamPayload(dto), false)
  assert.equal(toTeamPayload({ ...dto, isOwn: false }).is_own, false)
  assert.equal(toTeamPayload({ ...dto, isOwn: true }).is_own, true)
})
