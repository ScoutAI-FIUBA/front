import assert from 'node:assert/strict'
import test from 'node:test'
import {
  newTeamDefaults,
  normalizeTeamName,
  similarTeams,
  suggestForSides,
  suggestTeam,
  teamNamesInFile,
} from '../src/pages/partidos/team-suggestion.ts'
import type { MatchStatsImportPreview, Team } from '../src/types/index.ts'

const team = (id: string, name: string): Team => ({ id, name, shortName: name.slice(0, 3), city: 'x', country: 'y', isOwn: false })

test('normalizeTeamName lowercases and strips accents and punctuation', () => {
  assert.equal(normalizeTeamName('  Atlético   Unión, de Santa-Fe '), 'atletico union de santa fe')
  assert.equal(normalizeTeamName('C.A. Juventud'), 'ca juventud')
  assert.equal(normalizeTeamName('ÑANDÚ'), 'nandu')
})

test('suggestTeam ignores accents and case', () => {
  const teams = [team('1', 'Unión Lomas'), team('2', 'Peñarol')]
  assert.equal(suggestTeam('UNION LOMAS', teams)?.team.id, '1')
  assert.equal(suggestTeam('penarol', teams)?.team.id, '2')
})

test('"C.A. Juventud Moreno" suggests "Juventud"', () => {
  const found = suggestTeam('C.A. Juventud Moreno', [team('1', 'Juventud'), team('2', 'Belgrano')])
  assert.equal(found?.team.id, '1')
})

test('generic words alone do not make teams match', () => {
  assert.equal(suggestTeam('Club Atlético Norte', [team('1', 'Club Atlético Sur'), team('2', 'Club Deportivo Este')]), null)
  assert.equal(suggestTeam('Asociación Deportivo Norte', [team('1', 'Club Sur')]), null)
})

test('unrelated names and an empty list give no suggestion', () => {
  assert.equal(suggestTeam('Boca', [team('1', 'River'), team('2', 'Independiente')]), null)
  assert.equal(suggestTeam('Boca', []), null)
  assert.equal(suggestTeam('', [team('1', 'River')]), null)
  assert.equal(suggestTeam('Club', [team('1', 'Club')])?.team.id, '1')
})

test('identical names score 1', () => {
  const found = suggestTeam('Ferro', [team('1', 'Ferro'), team('2', 'Obras')])
  assert.equal(found?.score, 1)
})

test('two close candidates are ambiguous, a clearly better one wins', () => {
  assert.equal(suggestTeam('Juventud', [team('1', 'Juventud Moreno'), team('2', 'Juventud Unida')]), null)
  const found = suggestTeam('Juventud Moreno', [team('1', 'Juventud Moreno'), team('2', 'Juventud Unida')])
  assert.equal(found?.team.id, '1')
})

test('names that differ in a number or a single letter never match', () => {
  assert.equal(suggestTeam('Juventud Sub 17', [team('1', 'Juventud Sub 19')]), null)
  assert.equal(suggestTeam('Equipo A', [team('1', 'Equipo B')]), null)
  assert.deepEqual(similarTeams('Equipo A', [team('1', 'Equipo B')]), [])
})

test('similarTeams lists close teams best first and is more sensitive than suggestTeam', () => {
  const teams = [team('1', 'Juventud Unida'), team('2', 'Juventud Moreno'), team('3', 'Belgrano')]
  const list = similarTeams('Juventud', teams)
  assert.deepEqual(list.map((m) => m.team.id).sort(), ['1', '2'])
  assert.deepEqual(similarTeams('Belgrano', []), [])
  assert.equal(similarTeams('Belgrano', teams)[0].team.id, '3')
})

test('suggestForSides never suggests the same team twice', () => {
  const teams = [team('1', 'Juventud'), team('2', 'Belgrano')]
  const sides = suggestForSides({ HOME: 'C.A. Juventud Moreno', AWAY: 'Juventud' }, teams)
  assert.equal(sides.AWAY?.team.id, '1')
  assert.equal(sides.HOME, null)
  const both = suggestForSides({ HOME: 'Juventud', AWAY: 'Belgrano' }, teams)
  assert.equal(both.HOME?.team.id, '1')
  assert.equal(both.AWAY?.team.id, '2')
})

test('newTeamDefaults trims the typed name, city and country and derives the short name', () => {
  assert.deepEqual(newTeamDefaults('  Ferro Carril ', ' Buenos Aires ', ' Argentina '), {
    name: 'Ferro Carril',
    shortName: 'FER',
    city: 'Buenos Aires',
    country: 'Argentina',
    isOwn: false,
  })
})

test('teamNamesInFile prefers the report and falls back to the box score', () => {
  const preview = {
    report: { teams: [{ side: 'HOME', excelName: ' Ferro ' }] },
    boxScore: { teams: { HOME: { name: 'x' }, AWAY: { name: 'Obras' } } },
  } as unknown as MatchStatsImportPreview
  assert.deepEqual(teamNamesInFile(preview), { HOME: 'Ferro', AWAY: 'Obras' })
  const empty = { report: { teams: [] }, boxScore: null } as unknown as MatchStatsImportPreview
  assert.deepEqual(teamNamesInFile(empty), { HOME: '', AWAY: '' })
})
