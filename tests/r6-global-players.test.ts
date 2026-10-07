import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  filterGlobalPlayers,
  sortGlobalPlayers,
  UNASSIGNED_TEAM_FILTER,
} from '../src/pages/players/global-player-list.ts'
import { playerFormHasChanges, playerToFormValues } from '../src/pages/players/player-form.ts'
import type { Player } from '../src/types/index.ts'

function player(
  id: string,
  firstName: string,
  lastName: string,
  jerseyNumber?: string,
  teamId?: string,
): Player {
  return {
    id,
    firstName,
    lastName,
    birthDate: '2000-01-01',
    heightCm: 180,
    weightKg: 75,
    primaryPosition: 'PG',
    jerseyNumber,
    teamId,
    createdAt: '2026-01-01T00:00:00Z',
  }
}

test('global players use a stable surname and name order', () => {
  const players = [
    player('3', 'Zoe', 'Álvarez'),
    player('2', 'Ana', 'Base'),
    player('1', 'Ana', 'Álvarez'),
  ]

  assert.deepEqual(sortGlobalPlayers(players).map(({ id }) => id), ['1', '3', '2'])
})

test('global search covers name, surname, and jersey while unassigned stays explicit', () => {
  const players = [
    player('1', 'Ana', 'Base', '7', 'team-1'),
    player('2', 'Bea', 'Escolta', '12'),
  ]

  assert.deepEqual(filterGlobalPlayers(players, 'Escolta', 'all').map(({ id }) => id), ['2'])
  assert.deepEqual(filterGlobalPlayers(players, '7', 'all').map(({ id }) => id), ['1'])
  assert.deepEqual(filterGlobalPlayers(players, '', UNASSIGNED_TEAM_FILTER).map(({ id }) => id), ['2'])
})

test('profile updates run only when real player fields changed', () => {
  const current = player('1', 'Ana', 'Base', '7', 'team-1')
  const values = playerToFormValues(current)

  assert.equal(playerFormHasChanges(values, current), false)
  assert.equal(playerFormHasChanges({ ...values, weightKg: '76' }, current), true)
})

test('global sheet preserves assignment semantics and partial mutation feedback', () => {
  const page = readFileSync(new URL('../src/pages/players/PlayersPage.tsx', import.meta.url), 'utf8')
  const sheet = readFileSync(new URL('../src/pages/players/GlobalPlayerSheet.tsx', import.meta.url), 'utf8')
  const compatibility = readFileSync(new URL('../src/pages/players/PlayerNewPage.tsx', import.meta.url), 'utf8')

  assert.match(page, /Promise\.all\(\[/)
  assert.match(page, /UNASSIGNED_TEAM_FILTER/)
  assert.match(page, /sortGlobalPlayers/)
  assert.match(compatibility, /PlayersPage openCreateOnMount/)
  assert.match(sheet, /playerService\.update/)
  assert.match(sheet, /teamService\.addMember/)
  assert.match(sheet, /profileChanged && !teamChanged/)
  assert.match(sheet, /Los datos del perfil se guardaron, pero no se pudo mover/)
  assert.match(sheet, /\(isCreate \|\| !currentTeamId\)/)
  assert.match(sheet, /playersWithJersey\(destinationRoster/)
  assert.match(sheet, /Eliminar jugador del sistema/)
  assert.match(sheet, /Podés mantener este equipo o mover al jugador a otro plantel\./)
  assert.doesNotMatch(sheet, /No existe una acción para quitar/)
  assert.doesNotMatch(sheet, /Quitar del equipo/)
})
