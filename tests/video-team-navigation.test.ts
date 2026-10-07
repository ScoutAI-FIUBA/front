import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  ALL_VIDEO_TEAMS_FILTER,
  resolveVideoTeamFilter,
  teamVideosPath,
  withVideoTeamFilter,
} from '../src/pages/videos/video-team-navigation.ts'

const teams = [{ id: 'team-1' }, { id: 'team/2' }]

test('the compatibility helper still builds a team-scoped videos URL', () => {
  assert.equal(teamVideosPath('team-1'), '/videos?team_id=team-1')
  assert.equal(teamVideosPath('team/2'), '/videos?team_id=team%2F2')

  const source = readFileSync(
    new URL('../src/pages/teams/TeamsPage.tsx', import.meta.url),
    'utf8',
  )
  assert.doesNotMatch(source, /Ver videos/)
  assert.match(source, /Ver plantel/)
})

test('a valid team_id preselects that team', () => {
  const searchParams = new URLSearchParams('team_id=team-1')

  assert.equal(resolveVideoTeamFilter(searchParams, teams), 'team-1')
})

test('a missing or invalid team_id falls back to all teams', () => {
  assert.equal(resolveVideoTeamFilter(new URLSearchParams(), teams), ALL_VIDEO_TEAMS_FILTER)
  assert.equal(
    resolveVideoTeamFilter(new URLSearchParams('team_id=missing'), teams),
    ALL_VIDEO_TEAMS_FILTER,
  )
})

test('changing the selector updates both the query and resolved filter', () => {
  const current = new URLSearchParams('status=uploaded')
  const updated = withVideoTeamFilter(current, 'team/2')

  assert.equal(updated.get('team_id'), 'team/2')
  assert.equal(updated.get('status'), 'uploaded')
  assert.equal(resolveVideoTeamFilter(updated, teams), 'team/2')
})

test('choosing all teams removes team_id without dropping other query params', () => {
  const current = new URLSearchParams('team_id=team-1&status=uploaded')
  const updated = withVideoTeamFilter(current, ALL_VIDEO_TEAMS_FILTER)

  assert.equal(updated.has('team_id'), false)
  assert.equal(updated.get('status'), 'uploaded')
  assert.equal(resolveVideoTeamFilter(updated, teams), ALL_VIDEO_TEAMS_FILTER)
})
