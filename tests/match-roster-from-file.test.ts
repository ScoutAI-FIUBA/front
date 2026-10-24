import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createRostersThenRepreview,
  buildRosterRequest,
  mismatchAccepted,
  rosterCandidates,
  rosterCreatedMessage,
  splitFileName,
} from '../src/pages/partidos/match-import.ts'
import { emptyPlayerFormValues, playerFormSchema, playerFormToDto } from '../src/pages/players/player-form.ts'
import { toPlayerPayload } from '../src/services/api/mappers.ts'
import { positionLabel } from '../src/lib/positions.ts'
import type { MatchSide, MatchStatsImportPreview, UnlinkedReason } from '../src/types/index.ts'

test('splitFileName handles comma and no-comma names and re-cases upper case input', () => {
  assert.deepEqual(splitFileName('BELIZAN, LAUTARO MARTÍN'), { firstName: 'Lautaro Martín', lastName: 'Belizan' })
  assert.deepEqual(splitFileName('JAYLEN BROWN'), { firstName: 'Jaylen', lastName: 'Brown' })
  assert.deepEqual(splitFileName('DE LA FUENTE, JUAN'), { firstName: 'Juan', lastName: 'De la Fuente' })
  assert.deepEqual(splitFileName('GARCÍA-LÓPEZ, MARÍA DEL MAR'), { firstName: 'María del Mar', lastName: 'García-López' })
  assert.deepEqual(splitFileName("O'NEAL, SHAQ"), { firstName: 'Shaq', lastName: "O'Neal" })
})

test('splitFileName keeps mixed case, collapses spaces, and rejects single words', () => {
  assert.deepEqual(splitFileName('  Juan   Pérez '), { firstName: 'Juan', lastName: 'Pérez' })
  assert.deepEqual(splitFileName('McDonald, Ronald'), { firstName: 'Ronald', lastName: 'McDonald' })
  assert.equal(splitFileName('PELE'), null)
  assert.equal(splitFileName(''), null)
  assert.equal(splitFileName('PEREZ,'), null)
  assert.equal(splitFileName(`${'A'.repeat(200)} B`)?.firstName.length, 120)
})

interface FilePlayer { side: MatchSide; jersey: string | null; name: string; reason?: UnlinkedReason; played?: boolean }

function makePreview(players: FilePlayer[], matches: boolean | null = true): MatchStatsImportPreview {
  return {
    winnerTeamId: null,
    boxScore: {
      title: null,
      competition: null,
      teams: {} as never,
      players: players.map((p) => ({
        teamSide: p.side,
        jerseyNumber: p.jersey,
        name: p.name,
        played: p.played ?? true,
        playerId: null,
      })) as never,
    },
    report: {
      teams: (['HOME', 'AWAY'] as MatchSide[]).map((side) => ({
        side,
        excelName: side,
        teamId: side,
        teamName: side,
        nameScore: null,
        rosterScore: null,
        matchesSelectedTeam: side === 'AWAY' ? matches : true,
        playersInFile: 0,
        playersWhoPlayed: 0,
      })),
      linkedPlayers: [],
      unlinkedPlayers: players.map((p) => ({
        teamSide: p.side,
        jerseyNumber: p.jersey,
        name: p.name,
        reason: p.reason ?? 'no_roster_player',
      })),
      warnings: [],
    },
    savePayload: { stats: {}, winner_team_id: null, participants: [] },
  }
}

test('rosterCandidates keeps valid unlinked players of the side, played or not', () => {
  const preview = makePreview([
    { side: 'HOME', jersey: '7', name: 'BELIZAN, LAUTARO' },
    { side: 'HOME', jersey: '8', name: 'JAYLEN BROWN', played: false },
    { side: 'AWAY', jersey: '9', name: 'OTRO JUGADOR' },
  ])
  assert.deepEqual(rosterCandidates(preview, 'HOME').map((c) => `${c.jerseyNumber} ${c.firstName} ${c.lastName}`), [
    '7 Lautaro Belizan',
    '8 Jaylen Brown',
  ])
  assert.equal(rosterCandidates(preview, 'AWAY').length, 1)
})

test('rosterCandidates excludes duplicated jerseys, other reasons, no jersey, and single words', () => {
  const preview = makePreview([
    { side: 'HOME', jersey: '5', name: 'UNO DOS' },
    { side: 'HOME', jersey: '5', name: 'TRES CUATRO' },
    { side: 'HOME', jersey: '6', name: 'SEIS SEIS', reason: 'ambiguous_jersey_number' },
    { side: 'HOME', jersey: null, name: 'SIN NUMERO', reason: 'no_jersey_number' },
    { side: 'HOME', jersey: '10', name: 'SOLO' },
    { side: 'HOME', jersey: '11', name: 'ONCE BUENO' },
    { side: 'HOME', jersey: '12', name: 'DOCE ENLAZADO', reason: 'no_team_selected' },
  ])
  assert.deepEqual(rosterCandidates(preview, 'HOME').map((c) => c.jerseyNumber), ['11'])
})

test('rosterCandidates returns nothing for a side accepted as a team mismatch', () => {
  const preview = makePreview([
    { side: 'HOME', jersey: '7', name: 'UNO DOS' },
    { side: 'AWAY', jersey: '7', name: 'TRES CUATRO' },
  ], false)
  assert.equal(rosterCandidates(preview, 'HOME').length, 1)
  assert.equal(rosterCandidates(preview, 'AWAY').length, 0)
  assert.equal(mismatchAccepted(preview), true)
  assert.equal(mismatchAccepted(makePreview([], null)), false)
})

test('buildRosterRequest only includes sides turned on', () => {
  const preview = makePreview([
    { side: 'HOME', jersey: '7', name: 'UNO DOS' },
    { side: 'AWAY', jersey: '8', name: 'TRES CUATRO' },
  ])
  const teams = { HOME: { id: 'h', name: 'Local' }, AWAY: { id: 'a', name: 'Visita' } }
  assert.deepEqual(buildRosterRequest(preview, { HOME: false, AWAY: false }, teams), {})
  const only = buildRosterRequest(preview, { HOME: false, AWAY: true }, teams)
  assert.deepEqual(Object.keys(only), ['AWAY'])
  assert.deepEqual(only.AWAY?.players, [{ firstName: 'Tres', lastName: 'Cuatro', jerseyNumber: '8' }])
})

test('createRostersThenRepreview creates in order, then previews, and returns the new preview', async () => {
  const calls: string[] = []
  const before = makePreview([
    { side: 'HOME', jersey: '7', name: 'UNO DOS' },
    { side: 'AWAY', jersey: '8', name: 'TRES CUATRO' },
  ])
  const after = { ...makePreview([]), savePayload: { stats: {}, winner_team_id: null, participants: [{ team_side: 'HOME', display_name: 'x', player_id: 'p', jersey_number: '7' }] } }
  const result = await createRostersThenRepreview({
    playerService: {
      async createTeamRoster(teamId, players) {
        calls.push(`create:${teamId}:${players.length}`)
        return { created: players.map((p, i) => ({ id: `${teamId}${i}` }) as never), skipped: [] }
      },
    },
    repreview: async () => { calls.push('preview'); return after },
    rosters: buildRosterRequest(before, { HOME: true, AWAY: true }, {
      HOME: { id: 'h', name: 'Local' },
      AWAY: { id: 'a', name: 'Visita' },
    }),
  })
  assert.deepEqual(calls, ['create:h:1', 'create:a:1', 'preview'])
  assert.equal(result.preview.savePayload.participants.length, 1)
  assert.equal(rosterCreatedMessage(result.createdBySide), 'Se creó 1 jugador en Local. Se creó 1 jugador en Visita')
})

test('createRostersThenRepreview stops on failure without previewing; a retry succeeds', async () => {
  const calls: string[] = []
  let fail = true
  const rosters = { HOME: { teamId: 'h', teamName: 'Local', players: [{ firstName: 'A', lastName: 'B', jerseyNumber: '1' }] } }
  const params = {
    playerService: {
      async createTeamRoster() {
        calls.push('create')
        if (fail) throw new Error('boom')
        return { created: [], skipped: [{ jerseyNumber: '1', reason: 'jersey_taken' }] }
      },
    },
    repreview: async () => { calls.push('preview'); return makePreview([]) },
    rosters,
  }
  await assert.rejects(createRostersThenRepreview(params), /boom/)
  assert.deepEqual(calls, ['create'])
  fail = false
  const retry = await createRostersThenRepreview(params)
  assert.deepEqual(calls, ['create', 'create', 'preview'])
  assert.equal(rosterCreatedMessage(retry.createdBySide), null)
})

test('player form accepts empty optional fields and maps them to null', () => {
  const base = { ...emptyPlayerFormValues, firstName: 'Ana', lastName: 'Gómez' }
  assert.equal(playerFormSchema.safeParse(base).success, true)
  assert.deepEqual(playerFormToDto(base), {
    firstName: 'Ana',
    lastName: 'Gómez',
    primaryPosition: null,
    jerseyNumber: undefined,
    birthDate: null,
    heightCm: null,
    weightKg: null,
  })
  assert.equal(playerFormSchema.safeParse({ ...base, heightCm: '0' }).success, false)
  assert.equal(playerFormSchema.safeParse({ ...base, weightKg: 'abc' }).success, false)
  assert.equal(playerFormSchema.safeParse({ ...base, birthDate: '2999-01-01' }).success, false)
  const filled = playerFormToDto({ ...base, heightCm: '190', weightKg: '80', primaryPosition: 'PG', birthDate: '2000-01-01' })
  assert.equal(filled.heightCm, 190)
  assert.equal(filled.primaryPosition, 'PG')
})

test('player payload sends null instead of invented defaults; no position reads Sin posición', () => {
  const payload = toPlayerPayload({ firstName: 'A', lastName: 'B' })
  assert.equal(payload.height_cm, null)
  assert.equal(payload.weight_kg, null)
  assert.equal(payload.birth_date, null)
  assert.equal(payload.primary_position, null)
  assert.equal(positionLabel(null), 'Sin posición')
  assert.equal(positionLabel('PG'), 'Base')
})

test('rosterCandidates treats 05 and 5 as the same jersey, so neither is created', () => {
  const preview = makePreview([
    { side: 'HOME', jersey: '05', name: 'UNO DOS' },
    { side: 'HOME', jersey: '5', name: 'TRES CUATRO' },
    { side: 'HOME', jersey: '07', name: 'SIETE BUENO' },
  ])
  assert.deepEqual(rosterCandidates(preview, 'HOME').map((c) => c.jerseyNumber), ['07'])
})
