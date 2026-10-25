import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { playerFormSchema } from '../src/pages/players/player-form.ts'
import {
  duplicateJerseyNumbers,
  filterRosterPlayers,
  playersWithJersey,
} from '../src/pages/teams/team-roster.ts'
import type { Player } from '../src/types/index.ts'

function player(id: string, jerseyNumber?: string): Player {
  return {
    id,
    firstName: id === 'p1' ? 'Ana' : 'Bea',
    lastName: 'Base',
    birthDate: '2000-01-01',
    heightCm: 175,
    weightKg: 70,
    primaryPosition: 'PG',
    jerseyNumber,
    createdAt: '2026-01-01T00:00:00Z',
  }
}

const validForm = {
  firstName: 'Ana',
  lastName: 'Base',
  primaryPosition: 'PG',
  jerseyNumber: '0',
  birthDate: '2000-01-01',
  heightCm: '175',
  weightKg: '70',
}

test('player validation accepts optional profile fields and rejects invalid filled values', () => {
  assert.equal(playerFormSchema.safeParse(validForm).success, true)
  assert.equal(playerFormSchema.safeParse({
    ...validForm,
    primaryPosition: '',
    birthDate: '',
    heightCm: '',
    weightKg: '',
  }).success, true)
  assert.equal(playerFormSchema.safeParse({ ...validForm, birthDate: '2999-01-01' }).success, false)
  assert.equal(playerFormSchema.safeParse({ ...validForm, heightCm: '0' }).success, false)
  assert.equal(playerFormSchema.safeParse({ ...validForm, heightCm: '301' }).success, false)
  assert.equal(playerFormSchema.safeParse({ ...validForm, weightKg: '401' }).success, false)
  assert.equal(playerFormSchema.safeParse({ ...validForm, weightKg: '70.5' }).success, false)
  assert.equal(playerFormSchema.safeParse({ ...validForm, jerseyNumber: '123' }).success, false)
})

test('duplicate detection matches the backend string representation exactly', () => {
  const roster = [player('p1', '0'), player('p2', '00'), player('p3', '0')]

  assert.deepEqual([...duplicateJerseyNumbers(roster)], ['0'])
  assert.deepEqual(playersWithJersey(roster, '0').map(({ id }) => id), ['p1', 'p3'])
  assert.deepEqual(playersWithJersey(roster, '00').map(({ id }) => id), ['p2'])
  assert.deepEqual(playersWithJersey(roster, '0', 'p1').map(({ id }) => id), ['p3'])
})

test('roster search covers name and jersey', () => {
  const roster = [player('p1', '7'), player('p2', '12')]
  assert.deepEqual(filterRosterPlayers(roster, 'Ana').map(({ id }) => id), ['p1'])
  assert.deepEqual(filterRosterPlayers(roster, '12').map(({ id }) => id), ['p2'])
})

test('R6 routes and player sheet preserve compatibility and truthful actions', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  const teamsPage = readFileSync(new URL('../src/pages/teams/TeamsPage.tsx', import.meta.url), 'utf8')
  const sheet = readFileSync(new URL('../src/pages/teams/TeamRosterPlayerSheet.tsx', import.meta.url), 'utf8')

  assert.match(app, /path="\/equipos\/:teamId"/)
  assert.match(app, /path="\/jugadores"/)
  assert.match(app, /path="\/jugadores\/nuevo"/)
  assert.match(teamsPage, /Ver plantel/)
  assert.match(teamsPage, /\? 'jugador' : 'jugadores'/)
  assert.doesNotMatch(teamsPage, /Ver videos/)
  assert.match(sheet, /Eliminar jugador<\/p>/)
  assert.match(sheet, /Esto elimina el perfil completo del sistema\. No sólo lo quita de este equipo\./)
  assert.match(sheet, /Eliminar jugador del sistema/)
  assert.doesNotMatch(sheet, /Quitar del equipo/)
  assert.match(sheet, /Guardar y agregar otro/)
  assert.doesNotMatch(sheet, /bg-amber-50/)
})

test('mock team assignment closes the prior active membership before moving', () => {
  const source = readFileSync(new URL('../src/services/mock/teams.mock.ts', import.meta.url), 'utf8')
  assert.match(source, /existingMembership\.leftAt = movedAt/)
  assert.match(source, /player\.teamId = teamId/)
})
