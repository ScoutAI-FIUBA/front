import assert from 'node:assert/strict'
import test from 'node:test'
import { apiFetch } from '../src/services/api/http-client.ts'
import { ApiResponseError, isApiAuthenticationError } from '../src/services/api/errors.ts'
import {
  MatchApiError,
  buildPreviewFormData,
  isMatchApiError,
  mapApiMatch,
  mapImportPreview,
  mapMatchWithParticipants,
  parseMatchErrorBody,
  teamMismatchDetails,
  type ApiImportPreview,
} from '../src/services/api/matches.client.ts'

const line = (points: number, seconds: number) => ({
  minutes: `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`,
  seconds_played: seconds,
  points,
  two_point: { made: 4, attempted: 9, pct: 44.4 },
  three_point: { made: 0, attempted: 0, pct: null },
  free_throws: { made: 1, attempted: 2, pct: 50.0 },
  rebounds: { defensive: 3, offensive: 1, total: 4 },
  assists: 2,
  steals: 1,
  turnovers: 0,
  blocks: 0,
  blocks_received: 0,
  fouls: 2,
  fouls_drawn: 1,
  valuation: 7,
  plus_minus: -3,
})

const rawStats = {
  source: 'cabb_excel',
  schema_version: 1,
  title: 'Moreno vs Juventud',
  competition: 'MM - SUPERIOR 2026',
  teams: {
    HOME: { name: 'C.S.D.y C. Moreno', points: 71, totals: line(71, 2400) },
    AWAY: { name: 'JUVENTUD UNIDA', points: 73, totals: null },
  },
  players: [
    { team_side: 'HOME', jersey_number: '4', name: 'PEREZ J', played: true, player_id: 'p-1', ...line(9, 1200) },
    { team_side: 'AWAY', jersey_number: null, name: 'GOMEZ', played: false, player_id: null, ...line(0, 0) },
  ],
}

const rawPreview: ApiImportPreview = {
  winner_team_id: 'team-away',
  participants: [
    { team_side: 'HOME', display_name: 'PEREZ J', jersey_number: '4', player_id: 'p-1' },
  ],
  stats: rawStats,
  report: {
    teams: [
      {
        side: 'HOME',
        excel_name: 'C.S.D.y C. Moreno',
        team_id: 'team-home',
        team_name: 'Moreno',
        name_score: 0.8,
        roster_score: null,
        matches_selected_team: true,
        players_in_file: 12,
        players_who_played: 10,
      },
    ],
    linked_players: [
      { team_side: 'HOME', jersey_number: '4', name: 'PEREZ J', player_id: 'p-1', roster_name: 'Juan Perez' },
    ],
    unlinked_players: [{ team_side: 'AWAY', jersey_number: null, name: 'GOMEZ', reason: 'no_jersey_number' }],
    warnings: ["Moreno #4 PEREZ J: points do not equal 2P/3P/FT made"],
  },
}

test('mapImportPreview maps the backend preview and keeps percentages as sent', () => {
  const preview = mapImportPreview(structuredClone(rawPreview))
  assert.equal(preview.winnerTeamId, 'team-away')
  assert.equal(preview.boxScore?.competition, 'MM - SUPERIOR 2026')
  assert.equal(preview.boxScore?.teams.AWAY.totals, null)
  assert.equal(preview.boxScore?.teams.HOME.totals?.points, 71)
  const [player, bench] = preview.boxScore!.players
  assert.equal(player.twoPoint.pct, 44.4)
  assert.equal(player.threePoint.pct, null)
  assert.equal(player.plusMinus, -3)
  assert.equal(player.rebounds.total, 4)
  assert.equal(player.playerId, 'p-1')
  assert.equal(bench.played, false)
  assert.equal(bench.jerseyNumber, null)
  assert.equal(preview.report.teams[0].matchesSelectedTeam, true)
  assert.equal(preview.report.teams[0].rosterScore, null)
  assert.equal(preview.report.linkedPlayers[0].rosterName, 'Juan Perez')
  assert.equal(preview.report.unlinkedPlayers[0].reason, 'no_jersey_number')
  assert.equal(preview.report.warnings.length, 1)
})

test('savePayload is the raw wire data, snake_case and unchanged', () => {
  const input = structuredClone(rawPreview)
  const preview = mapImportPreview(input)
  assert.deepEqual(preview.savePayload, {
    stats: rawPreview.stats,
    winner_team_id: rawPreview.winner_team_id,
    participants: rawPreview.participants,
  })
  assert.equal(preview.savePayload.stats, input.stats)
})

test('mapApiMatch derives statsFormat: none, cabb_excel_v1 and unknown', () => {
  const base = {
    id: 'm1',
    home_team_id: 'h',
    away_team_id: 'a',
    winner_team_id: null,
    match_date: '2026-03-14',
    description: null,
    created_at: '2026-03-14T10:00:00',
    updated_at: '2026-03-14T10:00:00',
  }
  const none = mapApiMatch({ ...base, stats: null })
  assert.equal(none.statsFormat, 'none')
  assert.equal(none.boxScore, null)
  assert.equal(none.matchDate, '2026-03-14')

  const v1 = mapApiMatch({ ...base, stats: rawStats })
  assert.equal(v1.statsFormat, 'cabb_excel_v1')
  assert.equal(v1.boxScore?.players.length, 2)

  for (const stats of [
    { source: 'other', schema_version: 1 },
    { source: 'cabb_excel', schema_version: 2 },
    'texto',
    { source: 'cabb_excel', schema_version: 1 },
  ]) {
    const unknown = mapApiMatch({ ...base, stats })
    assert.equal(unknown.statsFormat, 'unknown')
    assert.equal(unknown.boxScore, null)
  }
})

test('mapMatchWithParticipants maps participants', () => {
  const mapped = mapMatchWithParticipants({
    match: { id: 'm', home_team_id: 'h', away_team_id: 'a', match_date: '2026-01-02', stats: null },
    participants: [
      { id: 'x', match_id: 'm', player_id: null, team_side: 'AWAY', display_name: 'GOMEZ', jersey_number: null },
    ],
  })
  assert.deepEqual(mapped.participants, [
    { id: 'x', playerId: null, teamSide: 'AWAY', displayName: 'GOMEZ', jerseyNumber: null },
  ])
})

test('parseMatchErrorBody handles the three error shapes', () => {
  const envelope = parseMatchErrorBody(
    422,
    JSON.stringify({
      error: {
        code: 'TEAM_MISMATCH',
        message: 'The team in the file does not look like the selected team.',
        details: {
          teams: [
            { side: 'HOME', selected_team: 'Boca', name_in_file: 'MORENO', name_score: 0.1, roster_score: null },
          ],
        },
      },
    }),
  )
  assert.ok(envelope instanceof MatchApiError)
  assert.ok(envelope instanceof ApiResponseError)
  assert.equal(envelope.status, 422)
  assert.ok(isMatchApiError(envelope, 'TEAM_MISMATCH'))
  assert.deepEqual(teamMismatchDetails(envelope), [
    { side: 'HOME', selectedTeam: 'Boca', nameInFile: 'MORENO', nameScore: 0.1, rosterScore: null },
  ])

  const fastapi = parseMatchErrorBody(422, JSON.stringify({ detail: [{ msg: 'bad uuid' }, { msg: 'other' }] }))
  assert.equal(fastapi.code, 'VALIDATION_ERROR')
  assert.equal(fastapi.message, 'bad uuid. other')
  assert.equal(parseMatchErrorBody(400, JSON.stringify({ detail: 'nope' })).code, 'VALIDATION_ERROR')

  const plain = parseMatchErrorBody(405, 'Method Not Allowed')
  assert.equal(plain.code, null)
  assert.equal(plain.message, 'Method Not Allowed')
  assert.equal(isMatchApiError(plain, 'TEAM_MISMATCH'), false)
  assert.deepEqual(teamMismatchDetails(plain), [])

  assert.ok(isApiAuthenticationError(parseMatchErrorBody(401, '{"detail":"x"}')))
})

test('buildPreviewFormData uses the backend field names', () => {
  const file = new Blob(['x'])
  const form = buildPreviewFormData({ file, fileName: 'planilla.xlsx', homeTeamId: 'h', awayTeamId: 'a' })
  assert.equal((form.get('file') as File).name, 'planilla.xlsx')
  assert.equal(form.get('home_team_id'), 'h')
  assert.equal(form.get('away_team_id'), 'a')
  assert.equal(form.has('allow_team_mismatch'), false)
  const allowed = buildPreviewFormData({
    file, fileName: 'p.csv', homeTeamId: 'h', awayTeamId: 'a', allowTeamMismatch: true,
  })
  assert.equal(allowed.get('allow_team_mismatch'), 'true')
  const denied = buildPreviewFormData({
    file, fileName: 'p.csv', homeTeamId: 'h', awayTeamId: 'a', allowTeamMismatch: false,
  })
  assert.equal(denied.has('allow_team_mismatch'), false)
})

test('apiFetch leaves Content-Type to the browser for FormData and keeps JSON for strings', async (t) => {
  const original = globalThis.fetch
  t.after(() => {
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: original })
  })
  const seen: Headers[] = []
  globalThis.fetch = ((_url: string | URL | Request, init?: RequestInit) => {
    seen.push(new Headers(init?.headers))
    return Promise.resolve(new Response('{}'))
  }) as typeof fetch

  await apiFetch('/x', { method: 'POST', body: new FormData() }, { auth: false })
  await apiFetch('/x', { method: 'POST', body: '{"a":1}' }, { auth: false })
  assert.equal(seen[0].has('Content-Type'), false)
  assert.equal(seen[1].get('Content-Type'), 'application/json')
})

test('apiFetch honours a custom timeout and timeout message', async (t) => {
  const original = globalThis.fetch
  t.mock.timers.enable({ apis: ['setTimeout'] })
  t.after(() => {
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: original })
  })
  let signal: AbortSignal | null = null
  globalThis.fetch = ((_url: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      signal = init?.signal ?? null
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    })) as typeof fetch

  const pending = apiFetch(
    '/x',
    { method: 'POST', body: new FormData() },
    { auth: false, timeoutMs: 60_000, timeoutMessage: 'Leer la planilla tardó demasiado. Probá de nuevo.' },
  )
  const outcome = assert.rejects(pending, { message: 'Leer la planilla tardó demasiado. Probá de nuevo.' })
  t.mock.timers.tick(25_000)
  assert.equal((signal as AbortSignal | null)?.aborted, false)
  t.mock.timers.tick(35_000)
  await outcome
})
