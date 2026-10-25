import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { mapApiTeam, toTeamPayload, type ApiTeam } from '../src/services/api/mappers.ts'

const apiTeam: ApiTeam = {
  id: 'team-1',
  name: 'Metropolitano',
  short_name: 'MET',
  city: 'Buenos Aires',
  country: 'Argentina',
  created_at: '2026-10-25T12:00:00Z',
  is_own: true,
}

test('team mapping preserves the backend is_own boolean', () => {
  assert.equal(mapApiTeam(apiTeam).isOwn, true)
  assert.equal(mapApiTeam({ ...apiTeam, is_own: false }).isOwn, false)
})

test('team creation leaves is_own omitted while updates preserve either boolean', () => {
  const identity = {
    name: 'Metropolitano',
    shortName: 'MET',
    city: 'Buenos Aires',
    country: 'Argentina',
  }

  assert.deepEqual(toTeamPayload(identity), {
    name: 'Metropolitano',
    short_name: 'MET',
    city: 'Buenos Aires',
    country: 'Argentina',
  })
  assert.equal(toTeamPayload({ ...identity, isOwn: true }).is_own, true)
  assert.equal(toTeamPayload({ ...identity, isOwn: false }).is_own, false)
})

test('both existing edit flows forward the loaded isOwn value without adding a control', () => {
  const teamsPage = readFileSync(new URL('../src/pages/teams/TeamsPage.tsx', import.meta.url), 'utf8')
  const teamDetail = readFileSync(new URL('../src/pages/teams/TeamDetailPage.tsx', import.meta.url), 'utf8')
  const dialog = readFileSync(new URL('../src/pages/teams/TeamFormDialog.tsx', import.meta.url), 'utf8')

  assert.match(teamsPage, /isOwn: editingTeam\.isOwn/)
  assert.match(teamDetail, /isOwn: team\.isOwn/)
  assert.doesNotMatch(dialog, /isOwn|is_own/)
})

test('mock creation uses the backend false default and mock edit preserves the supplied value', () => {
  const source = readFileSync(new URL('../src/services/mock/teams.mock.ts', import.meta.url), 'utf8')
  const store = readFileSync(new URL('../src/mocks/store.ts', import.meta.url), 'utf8')

  assert.match(source, /isOwn: dto\.isOwn \?\? false/)
  assert.match(source, /team\.isOwn = dto\.isOwn/)
  assert.match(store, /isOwn: team\.isOwn \?\? false/)
})
